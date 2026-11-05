export type PersonalContactCohort = "cohort-1" | "cohort-2" | "cohort-3";

export type PersonalContactFormData = {
  cohort: PersonalContactCohort;
  primaryEmail: string;
  alternativeEmail: string;
  mobile: string;
  address: string;
  emergencyName: string;
  relationship: string;
  emergencyContact: string;
  passport: string;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const COHORTS = new Set(["cohort-1", "cohort-2", "cohort-3"]);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

export function parsePersonalContactFormData(
  value: unknown
): PersonalContactFormData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cohort = asString(record.cohort);
  const primaryEmail = asString(record.primaryEmail);
  const mobile = asString(record.mobile);
  const address = asString(record.address);
  const emergencyName = asString(record.emergencyName);
  const relationship = asString(record.relationship);
  const emergencyContact = asString(record.emergencyContact);
  const signature = asString(record.signature);
  const signedAt = asString(record.signedAt);

  if (!COHORTS.has(cohort)) return null;
  if (!primaryEmail || !mobile || !address) return null;
  if (!emergencyName || !relationship || !emergencyContact) return null;
  if (!signature || !signedAt) return null;
  if (record.declared !== true) return null;

  return {
    cohort: cohort as PersonalContactCohort,
    primaryEmail,
    alternativeEmail: asString(record.alternativeEmail),
    mobile,
    address,
    emergencyName,
    relationship,
    emergencyContact,
    passport: asString(record.passport),
    evidenceAttached: asBoolean(record.evidenceAttached),
    evidenceFileName: asString(record.evidenceFileName),
    declared: true,
    signature,
    signedAt,
  };
}

export function validatePersonalContactFormData(
  value: unknown
): PersonalContactFormData {
  const parsed = parsePersonalContactFormData(value);
  if (!parsed) {
    throw new Error("Personal & contact information form is incomplete");
  }
  return parsed;
}

export function personalContactCohortLabel(
  value: PersonalContactCohort
): string {
  if (value === "cohort-2") return "Cohort 2";
  if (value === "cohort-3") return "Cohort 3";
  return "Cohort 1";
}
