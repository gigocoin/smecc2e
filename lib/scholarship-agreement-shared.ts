export type ScholarshipAgreementCohort =
  | "cohort-1"
  | "cohort-2"
  | "cohort-3";

export type ScholarshipAgreementFormData = {
  cohort: ScholarshipAgreementCohort;
  agreementVersion: string;
  effectiveDate: string;
  termsRead: boolean;
  financialAcknowledged: boolean;
  reportingAcknowledged: boolean;
  insuranceAcknowledged: boolean;
  grievanceAcknowledged: boolean;
  externalPdf: boolean;
  externalPdfName: string;
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

export function parseScholarshipAgreementFormData(
  value: unknown
): ScholarshipAgreementFormData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cohort = asString(record.cohort);
  const agreementVersion = asString(record.agreementVersion);
  const effectiveDate = asString(record.effectiveDate);
  const signature = asString(record.signature);
  const signedAt = asString(record.signedAt);

  if (!COHORTS.has(cohort)) return null;
  if (!agreementVersion || !effectiveDate) return null;
  if (!signature || !signedAt) return null;
  if (record.declared !== true) return null;
  if (
    !asBoolean(record.termsRead) ||
    !asBoolean(record.financialAcknowledged) ||
    !asBoolean(record.reportingAcknowledged) ||
    !asBoolean(record.insuranceAcknowledged) ||
    !asBoolean(record.grievanceAcknowledged)
  ) {
    return null;
  }

  return {
    cohort: cohort as ScholarshipAgreementCohort,
    agreementVersion,
    effectiveDate,
    termsRead: true,
    financialAcknowledged: true,
    reportingAcknowledged: true,
    insuranceAcknowledged: true,
    grievanceAcknowledged: true,
    externalPdf: asBoolean(record.externalPdf),
    externalPdfName: asString(record.externalPdfName),
    declared: true,
    signature,
    signedAt,
  };
}

export function validateScholarshipAgreementFormData(
  value: unknown
): ScholarshipAgreementFormData {
  const parsed = parseScholarshipAgreementFormData(value);
  if (!parsed) {
    throw new Error("Scholarship agreement form is incomplete");
  }
  return parsed;
}

export function scholarshipAgreementCohortLabel(
  value: ScholarshipAgreementCohort
): string {
  if (value === "cohort-2") return "Cohort 2";
  if (value === "cohort-3") return "Cohort 3";
  return "Cohort 1";
}
