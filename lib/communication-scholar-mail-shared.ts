import {
  applicantMailRecipient,
  type ApplicantMailRecipient,
} from "./communication-applicant-mail-shared";
import type { ApplicationRecord } from "./application-types";

export type ScholarMailSendMode = "all" | "single" | "selected";

export type ScholarMailRecipient = {
  scholarId: string;
  name: string;
  email: string;
};

export function isApprovedScholar(application: ApplicationRecord): boolean {
  return application.status === "approved";
}

export function scholarMailRecipient(
  application: ApplicationRecord
): ScholarMailRecipient | null {
  if (!isApprovedScholar(application)) return null;
  const recipient = applicantMailRecipient(application);
  if (!recipient) return null;
  return {
    scholarId: recipient.applicationId,
    name: recipient.name,
    email: recipient.email,
  };
}

export function scholarRecipientsFromApplications(
  applications: ApplicationRecord[]
): ScholarMailRecipient[] {
  const seen = new Set<string>();
  const recipients: ScholarMailRecipient[] = [];

  for (const application of applications) {
    const recipient = scholarMailRecipient(application);
    if (!recipient || seen.has(recipient.email)) continue;
    seen.add(recipient.email);
    recipients.push(recipient);
  }

  return recipients.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export function scholarRecipientsToMailRecipients(
  recipients: ScholarMailRecipient[]
): ApplicantMailRecipient[] {
  return recipients.map((recipient) => ({
    applicationId: recipient.scholarId,
    name: recipient.name,
    email: recipient.email,
  }));
}
