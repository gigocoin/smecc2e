export const NOMINEE_TARGET_GROUP_OPTIONS = [
  "Target Group 1",
  "Target Group 2",
  "Not Applicable",
] as const;

/** Scholarship agreement title — [Student/Staff/Trainee] Scholarship Agreement. */
export const NOMINEE_HOLDER_TYPE_OPTIONS = [
  "Student",
  "Staff",
  "Trainee",
] as const;

/** Agreement Art. 1.1 — the mobility activity the host institution supports. */
export const NOMINEE_MOBILITY_ACTIVITY_OPTIONS = [
  "Studies for degree seeking",
  "Research for credit seeking",
  "Teaching",
  "Training for Staff",
  "Training for trainees",
] as const;

/** Agreement Art. 9 & 12 — the plan the scholarship holder signs on arrival. */
export const NOMINEE_PLAN_DOCUMENT_OPTIONS = [
  "Learning Agreement",
  "Study Plan",
  "Research Plan",
  "Work Plan",
  "Traineeship Plan",
] as const;

/** Art. 12.1 — “must sign a Learning {…}”. */
export const NOMINEE_LEARNING_DOCUMENT_OPTIONS = [
  "Agreement",
  "Research Plan",
] as const;

/** Art. 12.1 — “possible changes made to the {…}”. */
export const NOMINEE_CHANGES_DOCUMENT_OPTIONS = [
  "Learning Agreement",
  "Study plan",
  "Research plan",
  "Traineeship Plan",
] as const;

/** Art. 12.2 — Staff/Trainee plan document. */
export const NOMINEE_STAFF_PLAN_DOCUMENT_OPTIONS = [
  "Work Plan",
  "Traineeship Plan",
] as const;

/** Agreement Art. 4 — monthly subsistence allowance rates by mobility type. */
export const NOMINEE_SUBSISTENCE_ALLOWANCE_OPTIONS = [
  {
    id: "masters-degree",
    amount: "EUR 890 /month",
    description: "Masters degree seeking mobility",
  },
  {
    id: "masters-credit",
    amount: "EUR 890 /month",
    description: "Masters credit seeking mobility",
  },
  {
    id: "doctoral-credit",
    amount: "EUR 1,230 /month",
    description: "Doctoral credit-seeking mobility",
  },
  {
    id: "degree-seeking",
    amount: "EUR 1,230 /month",
    description: "Degree seeking mobility",
  },
  {
    id: "trainee",
    amount: "EUR 1,230 /month",
    description: "Trainee mobility",
  },
  {
    id: "staff",
    amount: "EUR 2,370 /month",
    description: "Staff mobility",
  },
] as const;

export type NomineeSubsistenceAllowanceId =
  (typeof NOMINEE_SUBSISTENCE_ALLOWANCE_OPTIONS)[number]["id"];

export function formatNomineeSubsistenceAllowance(
  id: string,
  durationMonths: string
): string {
  const option = NOMINEE_SUBSISTENCE_ALLOWANCE_OPTIONS.find(
    (entry) => entry.id === id
  );
  if (!option) return "";
  const months = durationMonths?.trim() || "[duration]";
  return `${option.amount} × ${months} months for ${option.description}`;
}

export const NOMINEE_LETTER_PENDING = "[pending]";

/** Values pulled from the database — shown read-only in the letter modal. */
export type NomineeLetterAutoFields = {
  applicantNo: string;
  letterDate: string;
  firstName: string;
  surname: string;
  focalPersonName: string;
  focalPersonEmail: string;
  focalPersonAddress: string;
  /** Response deadline — pending until administrator sets the letter date. */
  responseDeadline: string;
  hostCountry: string;
  /** Scholarship agreement — identity of the scholarship holder. */
  dateOfBirth: string;
  nationality: string;
  homeAddress: string;
  phoneNumber: string;
  applicantEmail: string;
};

/** Values the coordinator can edit before sharing. */
export type NomineeLetterEditableFields = {
  hostUniversity: string;
  mobilityType: string;
  areaOfStudy: string;
  durationMonths: string;
  targetGroup: string;
  /** Scholarship agreement fields. */
  holderType: string;
  mobilityActivity: string;
  mobilityStartDate: string;
  mobilityEndDate: string;
  planDocument: string;
  /** Art. 12.1 — “Learning {Agreement | Research Plan}”. */
  learningDocument: string;
  /** Art. 12.1 — document named for possible changes. */
  changesDocument: string;
  /** Art. 12.2 — Work Plan or Traineeship Plan. */
  staffPlanDocument: string;
  /** Art. 4 subsistence allowance option id. */
  subsistenceAllowance: string;
  /** Agreement signature block — scholarship holder. */
  scholarshipHolderSignature: string;
  scholarshipHolderSignedDate: string;
  /** Agreement signature block — host university contact person. */
  hostContactSignature: string;
  hostContactSignedDate: string;
};

/** Snapshot persisted when the coordinator shares with the focal person. */
export type NomineeLetterSharedSnapshot = {
  editable: NomineeLetterEditableFields;
  focalPersonName: string;
  focalPersonEmail: string;
  focalPersonAddress: string;
  hostCountry: string;
  letterDate?: string;
  responseDeadline?: string;
};

export const PROJECT_COORDINATOR_SIGNATURE = [
  "Dr. Patrick Udeme-obong Akpan",
  "SMECC2E Intra-Africa Project Coordinator,",
  "Africa Centre of Excellence for Sustainable Power and Energy Development (ACE-SPED)",
  "University of Nigeria.",
  "Patrick.akpan@unn.edu.ng ; smecc2e@unn.edu.ng",
];

export const SMECC2E_PROJECT_EMAIL = "smecc2e@unn.edu.ng";

export const SMECC2E_PORTAL_URL = "https://smecc2e.online/";

export const PRIVACY_STATEMENT_URL =
  "https://ec.europa.eu/info/law/better-regulation/privacy-statement_en";

export function formatNomineeLetterDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function nomineeLetterResponseDeadline(from: Date): Date {
  const deadline = new Date(from.getTime());
  deadline.setDate(deadline.getDate() + 14);
  return deadline;
}

/** Parse an HTML date input value (`YYYY-MM-DD`) into a local Date. */
export function parseNomineeLetterDateInput(value: string): Date {
  const trimmed = value?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error("Letter date is required");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Letter date is invalid");
  }
  return date;
}

export function nomineeLetterDatesFromInput(value: string): {
  letterDate: string;
  responseDeadline: string;
} {
  const date = parseNomineeLetterDateInput(value);
  return {
    letterDate: formatNomineeLetterDate(date),
    responseDeadline: formatNomineeLetterDate(
      nomineeLetterResponseDeadline(date)
    ),
  };
}

/**
 * Format an optional `YYYY-MM-DD` value for display, falling back to the
 * pending placeholder while the date has not been chosen yet.
 */
export function formatOptionalNomineeLetterDate(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return NOMINEE_LETTER_PENDING;
  try {
    return formatNomineeLetterDate(parseNomineeLetterDateInput(trimmed));
  } catch {
    return trimmed;
  }
}

function fallback(value: string, placeholder: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || placeholder;
}

export function validateNomineeLetterFields(
  fields: NomineeLetterEditableFields
): NomineeLetterEditableFields {
  const hostUniversity = fields.hostUniversity?.trim() ?? "";
  const mobilityType = fields.mobilityType?.trim() ?? "";
  const areaOfStudy = fields.areaOfStudy?.trim() ?? "";
  const durationMonths = fields.durationMonths?.trim() ?? "";
  const targetGroup = fields.targetGroup?.trim() ?? "";

  if (!hostUniversity) throw new Error("Host university is required");
  if (!mobilityType) throw new Error("Type of mobility is required");
  if (!areaOfStudy) throw new Error("Area of study/work is required");
  if (!durationMonths) throw new Error("Maximum duration is required");
  if (!targetGroup) throw new Error("Target group is required");

  return {
    hostUniversity,
    mobilityType,
    areaOfStudy,
    durationMonths,
    targetGroup,
    // Agreement fields stay optional so drafts shared before the agreement
    // was added to the letter keep loading.
    holderType: fields.holderType?.trim() ?? "",
    mobilityActivity: fields.mobilityActivity?.trim() ?? "",
    mobilityStartDate: fields.mobilityStartDate?.trim() ?? "",
    mobilityEndDate: fields.mobilityEndDate?.trim() ?? "",
    planDocument: fields.planDocument?.trim() ?? "",
    learningDocument: fields.learningDocument?.trim() ?? "",
    changesDocument: fields.changesDocument?.trim() ?? "",
    staffPlanDocument: fields.staffPlanDocument?.trim() ?? "",
    subsistenceAllowance: fields.subsistenceAllowance?.trim() ?? "",
    scholarshipHolderSignature:
      fields.scholarshipHolderSignature?.trim() ?? "",
    scholarshipHolderSignedDate:
      fields.scholarshipHolderSignedDate?.trim() ?? "",
    hostContactSignature: fields.hostContactSignature?.trim() ?? "",
    hostContactSignedDate: fields.hostContactSignedDate?.trim() ?? "",
  };
}

export function parseNomineeLetterSharedSnapshot(
  value: unknown
): NomineeLetterSharedSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const editableRaw = record.editable;
  if (!editableRaw || typeof editableRaw !== "object") return null;
  const editableRecord = editableRaw as Record<string, unknown>;

  try {
    const editable = validateNomineeLetterFields({
      hostUniversity: String(editableRecord.hostUniversity ?? ""),
      mobilityType: String(editableRecord.mobilityType ?? ""),
      areaOfStudy: String(editableRecord.areaOfStudy ?? ""),
      durationMonths: String(editableRecord.durationMonths ?? ""),
      targetGroup: String(editableRecord.targetGroup ?? ""),
      holderType: String(editableRecord.holderType ?? ""),
      mobilityActivity: String(editableRecord.mobilityActivity ?? ""),
      mobilityStartDate: String(editableRecord.mobilityStartDate ?? ""),
      mobilityEndDate: String(editableRecord.mobilityEndDate ?? ""),
      planDocument: String(editableRecord.planDocument ?? ""),
      learningDocument: String(editableRecord.learningDocument ?? ""),
      changesDocument: String(editableRecord.changesDocument ?? ""),
      staffPlanDocument: String(editableRecord.staffPlanDocument ?? ""),
      subsistenceAllowance: String(editableRecord.subsistenceAllowance ?? ""),
      scholarshipHolderSignature: String(
        editableRecord.scholarshipHolderSignature ?? ""
      ),
      scholarshipHolderSignedDate: String(
        editableRecord.scholarshipHolderSignedDate ?? ""
      ),
      hostContactSignature: String(editableRecord.hostContactSignature ?? ""),
      hostContactSignedDate: String(
        editableRecord.hostContactSignedDate ?? ""
      ),
    });
    return {
      editable,
      focalPersonName: String(record.focalPersonName ?? ""),
      focalPersonEmail: String(record.focalPersonEmail ?? ""),
      focalPersonAddress: String(record.focalPersonAddress ?? ""),
      hostCountry: String(record.hostCountry ?? ""),
      letterDate:
        typeof record.letterDate === "string" ? record.letterDate : undefined,
      responseDeadline:
        typeof record.responseDeadline === "string"
          ? record.responseDeadline
          : undefined,
    };
  } catch {
    return null;
  }
}

export function buildNomineeLetterMessage(
  auto: NomineeLetterAutoFields,
  editable: NomineeLetterEditableFields
): string {
  const applicantNo = fallback(auto.applicantNo, "[applicant no]");
  const name = [auto.firstName, auto.surname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const hostUniversity = fallback(
    editable.hostUniversity,
    "[host university]"
  );
  const focalPerson = fallback(auto.focalPersonName, "[host contact person]");
  const focalEmail = fallback(auto.focalPersonEmail, "[host contact email]");
  const focalAddress = auto.focalPersonAddress?.trim() ?? "";

  return [
    `Our Ref: SMECC2E/${applicantNo}`,
    `Date: ${fallback(auto.letterDate, NOMINEE_LETTER_PENDING)}`,
    "",
    "Nomination Letter",
    "",
    `Dear ${fallback(name, "Applicant")},`,
    "",
    `We are pleased to inform you that your application (${applicantNo}) for the Intra-Africa – Mobility in Sustainable Energy & Materials, Energy Policy, Climate Change, Energy Economics and Environment (SMECC2E) Scholarship was successful and you were selected for a stay at the ${hostUniversity}. The details of the scholarship are as follows:`,
    "",
    "Programme: Intra-Africa Academic Mobility Scheme",
    "Title of the EU Project: Sustainable Energy & Materials, Energy Policy, Climate Change, Energy Economics and Environment (SMECC2E)",
    `Host University: ${hostUniversity}`,
    `Host University Contact Person: ${focalPerson}`,
    focalEmail,
    ...(focalAddress ? [focalAddress] : []),
    `Type of Mobility: ${fallback(editable.mobilityType, "[mobility type]")}`,
    `Area of study/work: ${fallback(editable.areaOfStudy, "[area of study]")}`,
    `Maximum duration: ${fallback(editable.durationMonths, "[duration]")} months`,
    `Target group (students only): ${fallback(editable.targetGroup, "[target group]")}`,
    "",
    "The scholarship covers a monthly subsistence allowance as well as full insurance coverage (accident, travel, health) for the duration of the scholarship.",
    "",
    "The travel costs will also be recovered in line with the conditions set in the scholarship agreement.",
    "",
    "The full details of the scholarship are provided in the enclosed scholarship agreement.",
    "",
    "You will need to establish your place of stay at the location of the Host University. The welcome and housing services of the Host University will assist you to find suitable accommodation.",
    "",
    `If you accept the scholarship nomination and agree with the terms of the enclosed scholarship agreement, please login to the SMECC2E Integrated portal (${SMECC2E_PORTAL_URL}) and sign the scholarship agreement on the portal. Download a copy of the signed agreement and send back to the Host University at ${focalPerson} (${focalEmail}) and a copy to us at ${SMECC2E_PROJECT_EMAIL} on or before 2 weeks from the date: ${fallback(auto.letterDate, NOMINEE_LETTER_PENDING)}, so that we can start taking the practical arrangements for your mobility. Failure to sign and submit the scholarship agreement within the stipulated period means that you have decided to forfeit/reject the nomination.`,
    "",
    "The European Education and Culture Executive Agency (EACEA), in the context of managing the Intra-Africa Academic Mobility Scheme, collects and processes the personal data of some of the candidates. In particular, certain data of the scholarship holders is shared with the Agency through the mobility tool under EU Funding and Tenders Portal and treated according to the following privacy statement.",
    "",
    `We wish you a successful stay at ${hostUniversity}, in ${fallback(auto.hostCountry, "[country]")}.`,
    "",
    "Yours sincerely,",
    "",
    ...PROJECT_COORDINATOR_SIGNATURE,
  ].join("\n");
}
