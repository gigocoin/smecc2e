export type ScholarshipAcceptanceCohort =
  | "cohort-1"
  | "cohort-2"
  | "cohort-3";

export type ScholarshipAcceptanceDecision = "accept" | "reject";

export type ScholarshipAcceptanceYesNo = "yes" | "no";

export type ScholarshipAcceptanceOverlap =
  | "none"
  | "potential"
  | "confirmed";

export type ScholarshipAcceptanceFormData = {
  cohort: ScholarshipAcceptanceCohort;
  decision: ScholarshipAcceptanceDecision;
  decisionDate: string;
  accurate: ScholarshipAcceptanceYesNo;
  accurateNote: string;
  otherEu: ScholarshipAcceptanceYesNo;
  otherAward: ScholarshipAcceptanceYesNo;
  fundingDetails: string;
  overlap: ScholarshipAcceptanceOverlap;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const COHORTS = new Set(["cohort-1", "cohort-2", "cohort-3"]);
const DECISIONS = new Set(["accept", "reject"]);
const YES_NO = new Set(["yes", "no"]);
const OVERLAPS = new Set(["none", "potential", "confirmed"]);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseScholarshipAcceptanceFormData(
  value: unknown
): ScholarshipAcceptanceFormData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cohort = asString(record.cohort);
  const decision = asString(record.decision);
  const accurate = asString(record.accurate);
  const otherEu = asString(record.otherEu);
  const otherAward = asString(record.otherAward);
  const overlap = asString(record.overlap);
  const signature = asString(record.signature);
  const signedAt = asString(record.signedAt);

  if (!COHORTS.has(cohort)) return null;
  if (!DECISIONS.has(decision)) return null;
  if (!YES_NO.has(accurate)) return null;
  if (!YES_NO.has(otherEu)) return null;
  if (!YES_NO.has(otherAward)) return null;
  if (!OVERLAPS.has(overlap)) return null;
  if (!signature || !signedAt) return null;
  if (!asString(record.decisionDate)) return null;
  if (record.declared !== true) return null;

  return {
    cohort: cohort as ScholarshipAcceptanceCohort,
    decision: decision as ScholarshipAcceptanceDecision,
    decisionDate: asString(record.decisionDate),
    accurate: accurate as ScholarshipAcceptanceYesNo,
    accurateNote: asString(record.accurateNote),
    otherEu: otherEu as ScholarshipAcceptanceYesNo,
    otherAward: otherAward as ScholarshipAcceptanceYesNo,
    fundingDetails: asString(record.fundingDetails),
    overlap: overlap as ScholarshipAcceptanceOverlap,
    evidenceAttached: Boolean(record.evidenceAttached),
    evidenceFileName: asString(record.evidenceFileName),
    declared: true,
    signature,
    signedAt,
  };
}

export function validateScholarshipAcceptanceFormData(
  value: unknown
): ScholarshipAcceptanceFormData {
  const parsed = parseScholarshipAcceptanceFormData(value);
  if (!parsed) {
    throw new Error("Scholarship acceptance form is incomplete");
  }
  if (parsed.accurate === "no" && !parsed.accurateNote) {
    throw new Error("Explain what has changed in your application information");
  }
  if (
    (parsed.otherEu === "yes" || parsed.otherAward === "yes") &&
    !parsed.fundingDetails
  ) {
    throw new Error("Enter the additional funding details");
  }
  return parsed;
}

export function scholarshipAcceptanceDecisionLabel(
  decision: ScholarshipAcceptanceDecision
): string {
  return decision === "accept" ? "Accept nomination" : "Reject nomination";
}

export function scholarshipAcceptanceYesNoLabel(
  value: ScholarshipAcceptanceYesNo
): string {
  return value === "yes" ? "Yes" : "No";
}

export function scholarshipAcceptanceOverlapLabel(
  value: ScholarshipAcceptanceOverlap
): string {
  if (value === "potential") return "Potential overlap";
  if (value === "confirmed") return "Confirmed overlap";
  return "None";
}

export function scholarshipAcceptanceCohortLabel(
  value: ScholarshipAcceptanceCohort
): string {
  if (value === "cohort-2") return "Cohort 2";
  if (value === "cohort-3") return "Cohort 3";
  return "Cohort 1";
}

export function formatScholarshipAcceptanceDownload(
  options: {
    applicationId: string;
    scholarName: string;
    email: string;
    host: string;
    mobilityType: string;
    form: ScholarshipAcceptanceFormData;
  }
): string {
  const { form } = options;
  const lines = [
    "SMECC2E Scholarship acceptance & funding declaration",
    "",
    `Scholar: ${options.scholarName}`,
    `Reference: ${options.applicationId}`,
    `Email: ${options.email}`,
    `Host: ${options.host || "—"}`,
    `Mobility: ${options.mobilityType || "—"}`,
    "",
    `Cohort: ${scholarshipAcceptanceCohortLabel(form.cohort)}`,
    `Decision: ${scholarshipAcceptanceDecisionLabel(form.decision)}`,
    `Decision date: ${form.decisionDate}`,
    `Application information still accurate: ${scholarshipAcceptanceYesNoLabel(form.accurate)}`,
    form.accurateNote ? `Accuracy note: ${form.accurateNote}` : "",
    `Other EU-funded scholarship: ${scholarshipAcceptanceYesNoLabel(form.otherEu)}`,
    `Other financial award: ${scholarshipAcceptanceYesNoLabel(form.otherAward)}`,
    form.fundingDetails ? `Funding details: ${form.fundingDetails}` : "",
    `Conflict / overlap: ${scholarshipAcceptanceOverlapLabel(form.overlap)}`,
    `Evidence attached: ${form.evidenceAttached ? "Yes" : "No"}`,
    form.evidenceFileName ? `Evidence file: ${form.evidenceFileName}` : "",
    `Declared: Yes`,
    `Signature: ${form.signature}`,
    `Signed at: ${form.signedAt}`,
  ].filter((line) => line !== undefined);

  return lines.join("\n");
}
