import type { ApplicationRecord } from "./application-types";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
} from "./application-types";
import { getApplication } from "./applications-service";
import { emailLayout, escapeHtml } from "./email-layout";
import {
  buildNomineeLetterMessage,
  formatNomineeLetterDate,
  nomineeLetterResponseDeadline,
  validateNomineeLetterFields,
  type NomineeLetterAutoFields,
  type NomineeLetterEditableFields,
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
} from "./nominee-letter-shared";
export { buildNomineeLetterMessage } from "./nominee-letter-shared";

export type NomineeLetterData = {
  auto: NomineeLetterAutoFields;
  editable: NomineeLetterEditableFields;
  applicantEmail: string;
  applicantName: string;
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

const SUBJECT_BASE = "SMECC2E Scholarship Programme — Nomination Letter";

function buildNomineeLetterSubject(initiatorName?: string | null): string {
  const name = initiatorName?.trim();
  if (!name) return SUBJECT_BASE;
  return `${SUBJECT_BASE} from ${name}`;
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

async function buildLetterData(
  application: ApplicationRecord,
  letterDate: Date
): Promise<NomineeLetterData> {
  const institution = application.preferredHostInstitution ?? "";
  const [focalPerson, hostCountry] = await Promise.all([
    findHostFocalPerson(institution),
    findHostCountry(institution),
  ]);

  return {
    auto: {
      applicantNo: application.id,
      letterDate: formatNomineeLetterDate(letterDate),
      firstName: application.firstName ?? "",
      surname: application.surname ?? "",
      focalPersonName: focalPerson?.name ?? "",
      focalPersonEmail: focalPerson?.email ?? "",
      focalPersonAddress: focalPerson?.address ?? "",
      responseDeadline: formatNomineeLetterDate(
        nomineeLetterResponseDeadline(letterDate)
      ),
      hostCountry,
    },
    editable: {
      hostUniversity: institution,
      mobilityType: application.typeOfMobility ?? "",
      areaOfStudy: application.proposedAcademicProgramme ?? "",
      durationMonths: "",
      targetGroup: "",
    },
    applicantEmail: applicantPrimaryEmail(application),
    applicantName: applicantDisplayName(application),
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
  applicantEmail: string;
  coordinatorEmails: string[];
  focalPersonEmail?: string | null;
  initiatorEmail?: string | null;
}): string[] {
  const exclude = normalizeEmail(options.applicantEmail);
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
  add(options.focalPersonEmail);
  add(options.initiatorEmail);

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
  applicationRef: string
): Promise<NomineeLetterData> {
  const application = await getApplication(applicationRef);
  if (!application) throw new Error("Application not found");
  assertNominated(application);
  return buildLetterData(application, new Date());
}

export async function sendNomineeLetterEmail(options: {
  applicationRef: string;
  fields: NomineeLetterEditableFields;
  initiatorEmail?: string | null;
  initiatorName?: string | null;
}): Promise<NomineeLetterSendResult> {
  const application = await getApplication(options.applicationRef);
  if (!application) throw new Error("Application not found");
  assertNominated(application);

  const editable = validateNomineeLetterFields(options.fields);
  const { auto } = await buildLetterData(application, new Date());
  const message = buildNomineeLetterMessage(auto, editable);
  const subject = buildNomineeLetterSubject(options.initiatorName);

  const email = applicantPrimaryEmail(application).trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Applicant does not have a valid email address");
  }

  const to = normalizeEmail(email);
  const coordinatorEmails = await listActiveCoordinatorEmails(to);
  const ccEmails = buildCcEmails({
    applicantEmail: to,
    coordinatorEmails,
    focalPersonEmail: auto.focalPersonEmail,
    initiatorEmail: options.initiatorEmail,
  });
  const resend = getResendClient();

  if (!resend) {
    console.log("[SMECC2E] Nomination letter (Resend not configured):");
    console.log({
      to,
      cc: ccEmails,
      subject,
      applicant: applicantDisplayName(application),
    });
    return {
      sent: true,
      email: to,
      ccEmails,
      subject,
      message,
      devMode: true,
    };
  }

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [to],
    ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
    subject,
    text: message,
    html: nomineeLetterHtml(message, subject),
  });

  if (error) {
    return {
      sent: false,
      email: to,
      ccEmails,
      subject,
      message,
      devMode: false,
      error: error.message ?? "Could not send nomination letter.",
    };
  }

  return {
    sent: true,
    email: to,
    ccEmails,
    subject,
    message,
    devMode: false,
  };
}
