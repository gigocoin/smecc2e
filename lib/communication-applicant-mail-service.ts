import type {
  ApplicantMailRecipient,
  ApplicantMailSendMode,
} from "./communication-applicant-mail-shared";
import { applicantMailRecipient } from "./communication-applicant-mail-shared";
import { emailLayout, escapeHtml } from "./email-layout";
import { listApplications } from "./applications-service";
import {
  getEmailFrom,
  getResendClient,
  isResendConfigured,
} from "./resend-client";

export type {
  ApplicantMailRecipient,
  ApplicantMailSendMode,
} from "./communication-applicant-mail-shared";
export { applicantMailRecipient } from "./communication-applicant-mail-shared";

export type ApplicantMailSendResult = {
  sent: number;
  failed: number;
  total: number;
  errors: string[];
  devMode: boolean;
};

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 10_000;

function dedupeApplicantMailRecipients(
  applications: Awaited<ReturnType<typeof listApplications>>
): ApplicantMailRecipient[] {
  const seen = new Set<string>();
  const recipients: ApplicantMailRecipient[] = [];

  for (const application of applications) {
    const recipient = applicantMailRecipient(application);
    if (!recipient || seen.has(recipient.email)) continue;
    seen.add(recipient.email);
    recipients.push(recipient);
  }

  return recipients.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

async function applicationsForMailPool(
  pool: "submitted" | "eligibility_checks" | "draft" | "any"
): Promise<Awaited<ReturnType<typeof listApplications>>> {
  const includeDrafts = pool === "draft" || pool === "any";
  const applications = await listApplications({ includeDrafts });

  switch (pool) {
    case "eligibility_checks":
      return applications.filter((app) => app.status === "under_review");
    case "draft":
      return applications.filter((app) => app.status === "draft");
    case "submitted":
      return applications.filter((app) => app.status !== "draft");
    default:
      return applications;
  }
}

export async function listApplicantMailRecipients(): Promise<
  ApplicantMailRecipient[]
> {
  return dedupeApplicantMailRecipients(
    await applicationsForMailPool("submitted")
  );
}

async function recipientsForMailMode(
  mode: ApplicantMailSendMode,
  applicationIds: string[] = []
): Promise<ApplicantMailRecipient[]> {
  if (mode === "all") {
    return dedupeApplicantMailRecipients(
      await applicationsForMailPool("any")
    );
  }
  if (mode === "eligibility_checks") {
    return dedupeApplicantMailRecipients(
      await applicationsForMailPool("eligibility_checks")
    );
  }
  if (mode === "draft") {
    return dedupeApplicantMailRecipients(
      await applicationsForMailPool("draft")
    );
  }

  const allRecipients = await dedupeApplicantMailRecipients(
    await applicationsForMailPool("any")
  );
  const byId = new Map(
    allRecipients.map((recipient) => [recipient.applicationId, recipient])
  );

  const uniqueIds = [
    ...new Set(applicationIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one applicant");
  }

  const recipients = uniqueIds
    .map((id) => byId.get(id))
    .filter((recipient): recipient is ApplicantMailRecipient => recipient != null);

  if (recipients.length === 0) {
    throw new Error("No valid applicant recipients found for the selection");
  }

  if (mode === "single" && recipients.length !== 1) {
    throw new Error("Select exactly one applicant");
  }

  return recipients;
}

export async function resolveApplicantMailRecipients(
  mode: ApplicantMailSendMode,
  applicationIds: string[] = []
): Promise<ApplicantMailRecipient[]> {
  return recipientsForMailMode(mode, applicationIds);
}

function messageToHtml(message: string): string {
  return escapeHtml(message.trim()).replace(/\r?\n/g, "<br />");
}

function messageToText(message: string): string {
  return message.trim();
}

function coordinatorMailHtml(options: {
  subject: string;
  message: string;
  recipientName: string;
  senderName: string;
}): string {
  const greeting = options.recipientName.trim()
    ? `Dear ${escapeHtml(options.recipientName)},`
    : "Dear Applicant,";

  return emailLayout({
    title: options.subject,
    preheader: options.subject,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
        ${greeting}
      </p>
      <div style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#334155;">
        ${messageToHtml(options.message)}
      </div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
        Kind regards,<br />
        <strong>${escapeHtml(options.senderName)}</strong><br />
        SMECC2E Project Team
      </p>
    `,
  });
}

function coordinatorMailText(options: {
  subject: string;
  message: string;
  recipientName: string;
  senderName: string;
}): string {
  const greeting = options.recipientName.trim()
    ? `Dear ${options.recipientName},`
    : "Dear Applicant,";

  return [
    greeting,
    "",
    messageToText(options.message),
    "",
    "Kind regards,",
    options.senderName,
    "SMECC2E Project Team",
  ].join("\n");
}

export function validateApplicantMailPayload(
  subject: string,
  message: string
): { subject: string; message: string } {
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  if (!trimmedSubject) {
    throw new Error("Email subject is required");
  }
  if (trimmedSubject.length > MAX_SUBJECT_LENGTH) {
    throw new Error(`Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer`);
  }
  if (!trimmedMessage) {
    throw new Error("Email message is required");
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }

  return { subject: trimmedSubject, message: trimmedMessage };
}

export async function sendApplicantMails(options: {
  mode: ApplicantMailSendMode;
  subject: string;
  message: string;
  applicationIds?: string[];
  senderName: string;
}): Promise<ApplicantMailSendResult> {
  const { subject, message } = validateApplicantMailPayload(
    options.subject,
    options.message
  );
  const recipients = await resolveApplicantMailRecipients(
    options.mode,
    options.applicationIds
  );

  const resend = getResendClient();
  const devMode = !resend;
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  if (devMode) {
    console.log("[SMECC2E] Applicant mail (Resend not configured):");
    console.log({ subject, recipients: recipients.map((r) => r.email) });
    return {
      sent: recipients.length,
      failed: 0,
      total: recipients.length,
      errors: [],
      devMode: true,
    };
  }

  for (const recipient of recipients) {
    try {
      const { error } = await resend.emails.send({
        from: getEmailFrom(),
        to: [recipient.email],
        subject,
        text: coordinatorMailText({
          subject,
          message,
          recipientName: recipient.name,
          senderName: options.senderName,
        }),
        html: coordinatorMailHtml({
          subject,
          message,
          recipientName: recipient.name,
          senderName: options.senderName,
        }),
      });

      if (error) {
        failed += 1;
        errors.push(`${recipient.email}: ${error.message}`);
      } else {
        sent += 1;
      }
    } catch (err) {
      failed += 1;
      errors.push(
        `${recipient.email}: ${
          err instanceof Error ? err.message : "Failed to send"
        }`
      );
    }
  }

  return {
    sent,
    failed,
    total: recipients.length,
    errors,
    devMode: false,
  };
}

export function applicantMailConfigurationError(): string {
  if (!isResendConfigured()) {
    return "Email delivery is not configured. Add RESEND_API_KEY to send applicant emails.";
  }
  return "Email delivery is not available.";
}
