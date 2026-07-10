import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
} from "./application-types";

export type ApplicantMailSendMode =
  | "all"
  | "single"
  | "selected"
  | "eligibility_checks"
  | "draft";

export type ApplicantMailRecipient = {
  applicationId: string;
  name: string;
  email: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function applicantMailRecipient(
  application: ApplicationRecord
): ApplicantMailRecipient | null {
  const email = applicantPrimaryEmail(application).trim();
  if (!email || !isValidEmail(email)) return null;
  const name = applicantDisplayName(application).trim() || "Applicant";
  return {
    applicationId: application.id,
    name,
    email: normalizeEmail(email),
  };
}
