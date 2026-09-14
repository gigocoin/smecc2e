import type { ApplicationRecord } from "./application-types";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
} from "./application-types";
import { getApplication } from "./applications-service";
import { emailLayout, escapeHtml } from "./email-layout";
import {
  buildNomineeLetterMessage,
  NOMINEE_LETTER_PENDING,
  nomineeLetterDatesFromInput,
  parseNomineeLetterSharedSnapshot,
  validateNomineeLetterFields,
  type NomineeLetterAutoFields,
  type NomineeLetterEditableFields,
  type NomineeLetterSharedSnapshot,
} from "./nominee-letter-shared";
import { prisma } from "./prisma";
import {
  getEmailFrom,
  getResendClient,
  isResendConfigured,
} from "./resend-client";

export type {
  NomineeLetterAutoFields,
  NomineeLetterEditableFields,
  NomineeLetterSharedSnapshot,
} from "./nominee-letter-shared";
export { buildNomineeLetterMessage } from "./nominee-letter-shared";

export type NomineeLetterMode = "share" | "send";

export type NomineeLetterData = {
  auto: NomineeLetterAutoFields;
  editable: NomineeLetterEditableFields;
  applicantEmail: string;
  applicantName: string;
  shared: boolean;
  sent: boolean;
};

export type NomineeLetterSendResult = {
  sent: boolean;
  email: string;
  ccEmails: string[];
  subject: string;
  message: string;
  devMode: boolean;
  error?: string;
};

const SUBJECT_BASE =
  "SMECC2E Scholarship Programme - Nomination Letter/Scholarship Agreement";
const SHARE_SUBJECT_BASE =
  "SMECC2E Scholarship Programme - Nomination Letter (for review)";

function buildNomineeLetterSubject(
  base: string,
  initiatorName?: string | null
): string {
  // Official nominee send always uses the fixed subject.
  if (base === SUBJECT_BASE) return SUBJECT_BASE;
  const name = initiatorName?.trim();
  if (!name) return base;
  return `${base} from ${name}`;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function nomineeLetterHtml(message: string, subject: string): string {
  return emailLayout({
    title: subject,
    preheader: subject,
    bodyHtml: `
      <div style="margin:0;font-size:14px;line-height:1.7;color:#334155;">
        ${escapeHtml(message).replace(/\r?\n/g, "<br />")}
      </div>
    `,
  });
}

function applicantDisplayFirstSurname(application: ApplicationRecord): string {
  return [application.firstName, application.surname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/** Scholarship-holder details the agreement names as parties to the contract. */
function applicantAgreementIdentity(application: ApplicationRecord) {
  return {
    dateOfBirth: application.dateOfBirth ?? "",
    nationality: application.nationality ?? "",
    homeAddress: application.homeAddress ?? "",
    phoneNumber: application.phoneNumber ?? "",
    applicantEmail: applicantPrimaryEmail(application),
  };
}

/** Focal person recorded for the applicant's preferred host institution. */
async function findHostFocalPerson(
  institution: string
): Promise<{ name: string; email: string; address: string } | null> {
  const name = institution.trim();
  if (!name) return null;

  const focalPerson = await prisma.user.findFirst({
    where: {
      institution: { equals: name, mode: "insensitive" },
      isFocalPerson: true,
    },
    select: { name: true, email: true, address: true },
  });

  if (!focalPerson) return null;
  return {
    name: focalPerson.name,
    email: focalPerson.email,
    address: focalPerson.address ?? "",
  };
}

/** Country of the host university, taken from its registered programmes. */
async function findHostCountry(institution: string): Promise<string> {
  const name = institution.trim();
  if (!name) return "";

  const program = await prisma.program.findFirst({
    where: { university: { name: { equals: name, mode: "insensitive" } } },
    select: { country: true },
    orderBy: { createdAt: "asc" },
  });

  return program?.country ?? "";
}

async function loadApplicantRow(applicationRef: string) {
  const row = await prisma.applicant.findFirst({
    where: {
      OR: [{ publicId: applicationRef }, { id: applicationRef }],
    },
    select: {
      id: true,
      nomineeLetterSharedData: true,
      nomineeLetterSharedAt: true,
      nomineeLetterSentAt: true,
    },
  });
  if (!row) throw new Error("Application not found");
  return row;
}

async function buildPrepareLetterData(
  application: ApplicationRecord,
  shared: NomineeLetterSharedSnapshot | null
): Promise<NomineeLetterData> {
  const institution =
    shared?.editable.hostUniversity ||
    application.preferredHostInstitution ||
    "";
  const [focalPerson, hostCountry] = await Promise.all([
    findHostFocalPerson(institution),
    findHostCountry(institution),
  ]);

  return {
    auto: {
      applicantNo: application.id,
      letterDate: NOMINEE_LETTER_PENDING,
      firstName: application.firstName ?? "",
      surname: application.surname ?? "",
      focalPersonName: focalPerson?.name ?? "",
      focalPersonEmail: focalPerson?.email ?? "",
      focalPersonAddress: focalPerson?.address ?? "",
      responseDeadline: NOMINEE_LETTER_PENDING,
      hostCountry,
      ...applicantAgreementIdentity(application),
    },
    editable: shared?.editable ?? {
      hostUniversity: institution,
      mobilityType: application.typeOfMobility ?? "",
      areaOfStudy: application.proposedAcademicProgramme ?? "",
      durationMonths: "",
      targetGroup: "",
      holderType: "",
      mobilityActivity: "",
      mobilityStartDate: "",
      mobilityEndDate: "",
      planDocument: "",
      learningDocument: "",
      changesDocument: "",
      staffPlanDocument: "",
      subsistenceAllowance: "",
      scholarshipHolderSignature: "",
      scholarshipHolderSignedDate: "",
      hostContactSignature: "",
      hostContactSignedDate: "",
    },
    applicantEmail: applicantPrimaryEmail(application),
    applicantName: applicantDisplayFirstSurname(application),
    shared: Boolean(shared),
    sent: false,
  };
}

function buildSendLetterData(
  application: ApplicationRecord,
  shared: NomineeLetterSharedSnapshot,
  sent: boolean
): NomineeLetterData {
  return {
    auto: {
      applicantNo: application.id,
      letterDate: shared.letterDate?.trim() || NOMINEE_LETTER_PENDING,
      firstName: application.firstName ?? "",
      surname: application.surname ?? "",
      focalPersonName: shared.focalPersonName,
      focalPersonEmail: shared.focalPersonEmail,
      focalPersonAddress: shared.focalPersonAddress,
      responseDeadline:
        shared.responseDeadline?.trim() || NOMINEE_LETTER_PENDING,
      hostCountry: shared.hostCountry,
      ...applicantAgreementIdentity(application),
    },
    editable: shared.editable,
    applicantEmail: applicantPrimaryEmail(application),
    applicantName: applicantDisplayFirstSurname(application),
    shared: true,
    sent,
  };
}

async function listActiveCoordinatorEmails(
  excludeEmail?: string
): Promise<string[]> {
  const coordinators = await prisma.user.findMany({
    where: {
      role: "COORDINATOR",
      status: "ACTIVE",
    },
    select: { email: true },
    orderBy: { publicId: "asc" },
  });

  const exclude = excludeEmail ? normalizeEmail(excludeEmail) : "";
  const emails: string[] = [];
  const seen = new Set<string>();

  for (const coordinator of coordinators) {
    const email = normalizeEmail(coordinator.email ?? "");
    if (!email || !isValidEmail(email) || email === exclude) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}

function buildCcEmails(options: {
  primaryEmail: string;
  coordinatorEmails: string[];
  extraEmails?: Array<string | null | undefined>;
}): string[] {
  const exclude = normalizeEmail(options.primaryEmail);
  const emails: string[] = [];
  const seen = new Set<string>();

  const add = (value: string | null | undefined) => {
    const email = normalizeEmail(value ?? "");
    if (!email || !isValidEmail(email) || email === exclude) return;
    if (seen.has(email)) return;
    seen.add(email);
    emails.push(email);
  };

  for (const email of options.coordinatorEmails) {
    add(email);
  }
  for (const email of options.extraEmails ?? []) {
    add(email);
  }

  return emails;
}

export function nomineeLetterConfigurationError(): string | null {
  if (isResendConfigured()) return null;
  return "Email delivery is not configured. Add RESEND_API_KEY to send nomination letters.";
}

function assertNominated(application: ApplicationRecord): void {
  if (application.status !== "offered") {
    throw new Error(
      "Nomination letters can only be sent for nominated applicants"
    );
  }
}

export async function getNomineeLetterData(
  applicationRef: string,
  mode: NomineeLetterMode = "share"
): Promise<NomineeLetterData> {
  const application = await getApplication(applicationRef);
  if (!application) throw new Error("Application not found");
  assertNominated(application);

  const row = await loadApplicantRow(applicationRef);
  const shared = parseNomineeLetterSharedSnapshot(row.nomineeLetterSharedData);
  const sent = Boolean(row.nomineeLetterSentAt);

  if (mode === "send") {
    if (!shared) {
      throw new Error(
        "The coordinator has not shared a nomination letter for this applicant yet"
      );
    }
    return buildSendLetterData(application, shared, sent);
  }

  return buildPrepareLetterData(application, shared);
}

async function deliverNomineeLetterEmail(options: {
  to: string;
  ccEmails: string[];
  subject: string;
  message: string;
  applicantLabel: string;
}): Promise<NomineeLetterSendResult> {
  const resend = getResendClient();

  if (!resend) {
    console.log("[SMECC2E] Nomination letter (Resend not configured):");
    console.log({
      to: options.to,
      cc: options.ccEmails,
      subject: options.subject,
      applicant: options.applicantLabel,
    });
    return {
      sent: true,
      email: options.to,
      ccEmails: options.ccEmails,
      subject: options.subject,
      message: options.message,
      devMode: true,
    };
  }

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [options.to],
    ...(options.ccEmails.length > 0 ? { cc: options.ccEmails } : {}),
    subject: options.subject,
    text: options.message,
    html: nomineeLetterHtml(options.message, options.subject),
  });

  if (error) {
    return {
      sent: false,
      email: options.to,
      ccEmails: options.ccEmails,
      subject: options.subject,
      message: options.message,
      devMode: false,
      error: error.message ?? "Could not send nomination letter.",
    };
  }

  return {
    sent: true,
    email: options.to,
    ccEmails: options.ccEmails,
    subject: options.subject,
    message: options.message,
    devMode: false,
  };
}

/** Coordinator: persist letter fields and email the host focal person. */
export async function shareNomineeLetterEmail(options: {
  applicationRef: string;
  fields: NomineeLetterEditableFields;
  initiatorEmail?: string | null;
  initiatorName?: string | null;
}): Promise<NomineeLetterSendResult> {
  const application = await getApplication(options.applicationRef);
  if (!application) throw new Error("Application not found");
  assertNominated(application);

  const row = await loadApplicantRow(options.applicationRef);
  const existing = parseNomineeLetterSharedSnapshot(row.nomineeLetterSharedData);
  const editableBase = validateNomineeLetterFields(options.fields);
  // Coordinators cannot sign; keep any signatures already captured by nominee/admin.
  const editable: NomineeLetterEditableFields = {
    ...editableBase,
    scholarshipHolderSignature:
      existing?.editable.scholarshipHolderSignature ?? "",
    scholarshipHolderSignedDate:
      existing?.editable.scholarshipHolderSignedDate ?? "",
    hostContactSignature: existing?.editable.hostContactSignature ?? "",
    hostContactSignedDate: existing?.editable.hostContactSignedDate ?? "",
  };

  const [focalPerson, hostCountry] = await Promise.all([
    findHostFocalPerson(editable.hostUniversity),
    findHostCountry(editable.hostUniversity),
  ]);

  const snapshot: NomineeLetterSharedSnapshot = {
    editable,
    focalPersonName: focalPerson?.name ?? "",
    focalPersonEmail: focalPerson?.email ?? "",
    focalPersonAddress: focalPerson?.address ?? "",
    hostCountry,
  };

  await prisma.applicant.update({
    where: { id: row.id },
    data: {
      nomineeLetterSharedData: snapshot,
      nomineeLetterSharedAt: new Date(),
      nomineeLetterSentAt: null,
    },
  });

  const auto: NomineeLetterAutoFields = {
    applicantNo: application.id,
    letterDate: NOMINEE_LETTER_PENDING,
    firstName: application.firstName ?? "",
    surname: application.surname ?? "",
    focalPersonName: snapshot.focalPersonName,
    focalPersonEmail: snapshot.focalPersonEmail,
    focalPersonAddress: snapshot.focalPersonAddress,
    responseDeadline: NOMINEE_LETTER_PENDING,
    hostCountry: snapshot.hostCountry,
    ...applicantAgreementIdentity(application),
  };
  const message = buildNomineeLetterMessage(auto, editable);
  const subject = buildNomineeLetterSubject(
    SHARE_SUBJECT_BASE,
    options.initiatorName
  );

  const focalEmail = normalizeEmail(snapshot.focalPersonEmail);
  if (!focalEmail || !isValidEmail(focalEmail)) {
    throw new Error(
      "Host focal person email is required before sharing the nomination letter"
    );
  }

  const coordinatorEmails = await listActiveCoordinatorEmails(focalEmail);
  const ccEmails = buildCcEmails({
    primaryEmail: focalEmail,
    coordinatorEmails,
    extraEmails: [options.initiatorEmail],
  });

  return deliverNomineeLetterEmail({
    to: focalEmail,
    ccEmails,
    subject,
    message,
    applicantLabel: applicantDisplayName(application),
  });
}

/** Administrator: set letter date on the shared draft and email the applicant. */
export async function sendNomineeLetterEmail(options: {
  applicationRef: string;
  letterDateInput: string;
  initiatorEmail?: string | null;
  initiatorName?: string | null;
}): Promise<NomineeLetterSendResult> {
  const application = await getApplication(options.applicationRef);
  if (!application) throw new Error("Application not found");
  assertNominated(application);

  const row = await loadApplicantRow(options.applicationRef);
  const shared = parseNomineeLetterSharedSnapshot(row.nomineeLetterSharedData);
  if (!shared) {
    throw new Error(
      "The coordinator has not shared a nomination letter for this applicant yet"
    );
  }

  const dates = nomineeLetterDatesFromInput(options.letterDateInput);
  const updatedSnapshot: NomineeLetterSharedSnapshot = {
    ...shared,
    letterDate: dates.letterDate,
    responseDeadline: dates.responseDeadline,
  };

  await prisma.applicant.update({
    where: { id: row.id },
    data: {
      nomineeLetterSharedData: updatedSnapshot,
      nomineeLetterSentAt: new Date(),
    },
  });

  const auto: NomineeLetterAutoFields = {
    applicantNo: application.id,
    letterDate: dates.letterDate,
    firstName: application.firstName ?? "",
    surname: application.surname ?? "",
    focalPersonName: updatedSnapshot.focalPersonName,
    focalPersonEmail: updatedSnapshot.focalPersonEmail,
    focalPersonAddress: updatedSnapshot.focalPersonAddress,
    responseDeadline: dates.responseDeadline,
    hostCountry: updatedSnapshot.hostCountry,
    ...applicantAgreementIdentity(application),
  };
  const message = buildNomineeLetterMessage(auto, updatedSnapshot.editable);
  const subject = buildNomineeLetterSubject(SUBJECT_BASE, options.initiatorName);

  const email = applicantPrimaryEmail(application).trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Applicant does not have a valid email address");
  }

  const to = normalizeEmail(email);
  const coordinatorEmails = await listActiveCoordinatorEmails(to);
  const ccEmails = buildCcEmails({
    primaryEmail: to,
    coordinatorEmails,
    extraEmails: [updatedSnapshot.focalPersonEmail, options.initiatorEmail],
  });

  return deliverNomineeLetterEmail({
    to,
    ccEmails,
    subject,
    message,
    applicantLabel: applicantDisplayName(application),
  });
}

/** Applicant: persist scholarship-holder digital signature on the shared agreement. */
export async function signNomineeLetterAsScholarshipHolder(options: {
  applicationRef: string;
  signature: string;
  signedDate: string;
}): Promise<{ signed: boolean; signature: string; signedDate: string }> {
  const application = await getApplication(options.applicationRef);
  if (!application) throw new Error("Application not found");
  if (
    application.status !== "offered" &&
    application.status !== "approved" &&
    application.status !== "pre_departure"
  ) {
    throw new Error(
      "Scholarship agreements can only be signed by nominated applicants"
    );
  }

  const row = await loadApplicantRow(options.applicationRef);
  const shared = parseNomineeLetterSharedSnapshot(row.nomineeLetterSharedData);
  if (!shared) {
    throw new Error(
      "Your nomination letter and scholarship agreement are not available yet"
    );
  }

  if (
    shared.editable.scholarshipHolderSignature?.trim() &&
    shared.editable.scholarshipHolderSignedDate?.trim()
  ) {
    throw new Error("The scholarship holder has already signed this agreement");
  }

  const signature = options.signature?.trim() ?? "";
  const signedDate = options.signedDate?.trim() ?? "";
  if (!signature) throw new Error("Signature is required");
  if (!signedDate) throw new Error("Signature date is required");

  const updatedSnapshot: NomineeLetterSharedSnapshot = {
    ...shared,
    editable: {
      ...shared.editable,
      scholarshipHolderSignature: signature,
      scholarshipHolderSignedDate: signedDate,
    },
  };

  await prisma.applicant.update({
    where: { id: row.id },
    data: { nomineeLetterSharedData: updatedSnapshot },
  });

  return { signed: true, signature, signedDate };
}

/** Administrator: persist host-contact digital signature after the nominee has signed. */
export async function signNomineeLetterAsHostContact(options: {
  applicationRef: string;
  signature: string;
  signedDate: string;
}): Promise<{ signed: boolean; signature: string; signedDate: string }> {
  const application = await getApplication(options.applicationRef);
  if (!application) throw new Error("Application not found");
  assertNominated(application);

  const row = await loadApplicantRow(options.applicationRef);
  const shared = parseNomineeLetterSharedSnapshot(row.nomineeLetterSharedData);
  if (!shared) {
    throw new Error(
      "The coordinator has not shared a nomination letter for this applicant yet"
    );
  }

  if (
    !shared.editable.scholarshipHolderSignature?.trim() ||
    !shared.editable.scholarshipHolderSignedDate?.trim()
  ) {
    throw new Error(
      "The scholarship holder must sign the agreement before the host contact can sign"
    );
  }

  if (
    shared.editable.hostContactSignature?.trim() &&
    shared.editable.hostContactSignedDate?.trim()
  ) {
    throw new Error("The host contact person has already signed this agreement");
  }

  const signature = options.signature?.trim() || shared.focalPersonName.trim();
  const signedDate = options.signedDate?.trim() ?? "";
  if (!signature) throw new Error("Host contact signature is required");
  if (!signedDate) throw new Error("Signature date is required");

  const updatedSnapshot: NomineeLetterSharedSnapshot = {
    ...shared,
    editable: {
      ...shared.editable,
      hostContactSignature: signature,
      hostContactSignedDate: signedDate,
    },
  };

  await prisma.applicant.update({
    where: { id: row.id },
    data: { nomineeLetterSharedData: updatedSnapshot },
  });

  return { signed: true, signature, signedDate };
}
