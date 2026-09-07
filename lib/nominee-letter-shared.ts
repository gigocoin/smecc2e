export const NOMINEE_TARGET_GROUP_OPTIONS = [
  "Target Group 1",
  "Target Group 2",
  "Not Applicable",
] as const;

/** Values pulled from the database — shown read-only in the letter modal. */
export type NomineeLetterAutoFields = {
  applicantNo: string;
  letterDate: string;
  firstName: string;
  surname: string;
  focalPersonName: string;
  focalPersonEmail: string;
  focalPersonAddress: string;
  /** Two weeks after the letter date. */
  responseDeadline: string;
  hostCountry: string;
};

/** Values the coordinator can edit before sending. */
export type NomineeLetterEditableFields = {
  hostUniversity: string;
  mobilityType: string;
  areaOfStudy: string;
  durationMonths: string;
  targetGroup: string;
};

export const PROJECT_COORDINATOR_SIGNATURE = [
  "Dr. Patrick Udeme-obong Akpan",
  "SMECC2E Intra-Africa Project Coordinator,",
  "Africa Centre of Excellence for Sustainable Power and Energy Development (ACE-SPED)",
  "University of Nigeria.",
  "Patrick.akpan@unn.edu.ng ; smecc2e@unn.edu.ng",
];

export const SMECC2E_PROJECT_EMAIL = "smecc2e@unn.edu.ng";

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
  };
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
    `Date: ${fallback(auto.letterDate, "[date]")}`,
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
    `If you accept the scholarship and agree with the terms of the enclosed scholarship agreement on the SMECC2E Portal (please login to the SMECC2E application portal to view the draft agreement), sign it digitally and submit on the portal. Download a copy of the signed agreement and send back to the Host University at ${focalPerson} (${focalEmail}) and a copy to us at ${SMECC2E_PROJECT_EMAIL} on or before ${fallback(auto.responseDeadline, "[response deadline]")}, so that we can start taking the practical arrangements for your mobility. Failure to sign and submit the scholarship agreement within the stipulated period means that you have decided to forfeit/reject the nomination.`,
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
