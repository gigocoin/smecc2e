import { listApplications } from "./applications-service";
import { validateApplicantMailPayload } from "./communication-applicant-mail-service";
import type { ApplicantMailSendResult } from "./communication-applicant-mail-service";
import type { ScholarMailRecipient, ScholarMailSendMode } from "./communication-scholar-mail-shared";
import {
  scholarMailRecipient,
  scholarRecipientsFromApplications,
  scholarRecipientsToMailRecipients,
} from "./communication-scholar-mail-shared";
import { emailLayout, escapeHtml } from "./email-layout";
import {
  getEmailFrom,
  getResendClient,
  isResendConfigured,
} from "./resend-client";

export type { ScholarMailRecipient, ScholarMailSendMode } from "./communication-scholar-mail-shared";
export { scholarMailRecipient } from "./communication-scholar-mail-shared";

export type ScholarMailSendResult = ApplicantMailSendResult;

async function listScholarApplications() {
  const applications = await listApplications();
  return applications.filter((app) => app.status === "approved");
}

export async function listScholarMailRecipients(): Promise<ScholarMailRecipient[]> {
  return scholarRecipientsFromApplications(await listScholarApplications());
}

export async function resolveScholarMailRecipients(
  mode: ScholarMailSendMode,
  scholarIds: string[] = []
): Promise<ScholarMailRecipient[]> {
  const allRecipients = await listScholarMailRecipients();
  const byId = new Map(
    allRecipients.map((recipient) => [recipient.scholarId, recipient])
  );

  if (mode === "all") {
    return allRecipients;
  }

  const uniqueIds = [
    ...new Set(scholarIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one scholar");
  }

  const recipients = uniqueIds
    .map((id) => byId.get(id))
    .filter((recipient): recipient is ScholarMailRecipient => recipient != null);

  if (recipients.length === 0) {
    throw new Error("No valid scholar recipients found for the selection");
  }

  if (mode === "single" && recipients.length !== 1) {
    throw new Error("Select exactly one scholar");
  }

  return recipients;
}

function coordinatorScholarMailHtml(options: {
  subject: string;
  message: string;
  recipientName: string;
  senderName: string;
}): string {
  const greeting = options.recipientName.trim()
    ? `Dear ${escapeHtml(options.recipientName)},`
    : "Dear Scholar,";

  return emailLayout({
    title: options.subject,
    preheader: options.subject,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
        ${greeting}
      </p>
      <div style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#334155;">
        ${escapeHtml(options.message.trim()).replace(/\r?\n/g, "<br />")}
      </div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
        Kind regards,<br />
        <strong>${escapeHtml(options.senderName)}</strong><br />
        SMECC2E Project Team
      </p>
    `,
  });
}

function coordinatorScholarMailText(options: {
  subject: string;
  message: string;
  recipientName: string;
  senderName: string;
}): string {
  const greeting = options.recipientName.trim()
    ? `Dear ${options.recipientName},`
    : "Dear Scholar,";

  return [
    greeting,
    "",
    options.message.trim(),
    "",
    "Kind regards,",
    options.senderName,
    "SMECC2E Project Team",
  ].join("\n");
}

export async function sendScholarMails(options: {
  mode: ScholarMailSendMode;
  subject: string;
  message: string;
  scholarIds?: string[];
  senderName: string;
}): Promise<ScholarMailSendResult> {
  const { subject, message } = validateApplicantMailPayload(
    options.subject,
    options.message
  );
  const recipients = await resolveScholarMailRecipients(
    options.mode,
    options.scholarIds
  );
  const mailRecipients = scholarRecipientsToMailRecipients(recipients);

  const resend = getResendClient();
  const devMode = !resend;
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  if (devMode) {
    console.log("[SMECC2E] Scholar mail (Resend not configured):");
    console.log({ subject, recipients: mailRecipients.map((r) => r.email) });
    return {
      sent: mailRecipients.length,
      failed: 0,
      total: mailRecipients.length,
      errors: [],
      devMode: true,
    };
  }

  for (const recipient of mailRecipients) {
    try {
      const { error } = await resend.emails.send({
        from: getEmailFrom(),
        to: [recipient.email],
        subject,
        text: coordinatorScholarMailText({
          subject,
          message,
          recipientName: recipient.name,
          senderName: options.senderName,
        }),
        html: coordinatorScholarMailHtml({
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
    total: mailRecipients.length,
    errors,
    devMode: false,
  };
}

export function scholarMailConfigurationError(): string {
  if (!isResendConfigured()) {
    return "Email delivery is not configured. Add RESEND_API_KEY to send scholar emails.";
  }
  return "Email delivery is not available.";
}
