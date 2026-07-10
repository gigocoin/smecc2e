import { validateApplicantMailPayload } from "./communication-applicant-mail-service";
import type { ApplicantMailSendResult } from "./communication-applicant-mail-service";
import type { UserMailRecipient, UserMailSendMode } from "./communication-user-mail-shared";
import {
  userMailRecipient,
  userRecipientsFromUsers,
} from "./communication-user-mail-shared";
import { emailLayout, escapeHtml } from "./email-layout";
import {
  getEmailFrom,
  getResendClient,
  isResendConfigured,
} from "./resend-client";
import { listUsers } from "./users-service";

export type { UserMailRecipient, UserMailSendMode } from "./communication-user-mail-shared";
export { userMailRecipient } from "./communication-user-mail-shared";

export type UserMailSendResult = ApplicantMailSendResult;

export async function listUserMailRecipients(): Promise<UserMailRecipient[]> {
  return userRecipientsFromUsers(await listUsers());
}

export async function resolveUserMailRecipients(
  mode: UserMailSendMode,
  userIds: string[] = []
): Promise<UserMailRecipient[]> {
  const allRecipients = await listUserMailRecipients();
  const byId = new Map(
    allRecipients.map((recipient) => [recipient.userId, recipient])
  );

  if (mode === "all") {
    return allRecipients;
  }

  const uniqueIds = [
    ...new Set(userIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one user");
  }

  const recipients = uniqueIds
    .map((id) => byId.get(id))
    .filter((recipient): recipient is UserMailRecipient => recipient != null);

  if (recipients.length === 0) {
    throw new Error("No valid user recipients found for the selection");
  }

  if (mode === "single" && recipients.length !== 1) {
    throw new Error("Select exactly one user");
  }

  return recipients;
}

function coordinatorUserMailHtml(options: {
  subject: string;
  message: string;
  recipientName: string;
  senderName: string;
}): string {
  const greeting = options.recipientName.trim()
    ? `Dear ${escapeHtml(options.recipientName)},`
    : "Dear Team Member,";

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

function coordinatorUserMailText(options: {
  subject: string;
  message: string;
  recipientName: string;
  senderName: string;
}): string {
  const greeting = options.recipientName.trim()
    ? `Dear ${options.recipientName},`
    : "Dear Team Member,";

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

export async function sendUserMails(options: {
  mode: UserMailSendMode;
  subject: string;
  message: string;
  userIds?: string[];
  senderName: string;
}): Promise<UserMailSendResult> {
  const { subject, message } = validateApplicantMailPayload(
    options.subject,
    options.message
  );
  const recipients = await resolveUserMailRecipients(
    options.mode,
    options.userIds
  );

  const resend = getResendClient();
  const devMode = !resend;
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  if (devMode) {
    console.log("[SMECC2E] User mail (Resend not configured):");
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
        text: coordinatorUserMailText({
          subject,
          message,
          recipientName: recipient.name,
          senderName: options.senderName,
        }),
        html: coordinatorUserMailHtml({
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

export function userMailConfigurationError(): string {
  if (!isResendConfigured()) {
    return "Email delivery is not configured. Add RESEND_API_KEY to send team emails.";
  }
  return "Email delivery is not available.";
}
