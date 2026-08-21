import {
  applicantDisplayName,
  applicantPrimaryEmail,
} from "./application-types";
import { getApplication } from "./applications-service";
import { emailLayout, escapeHtml } from "./email-layout";
import {
  buildInterviewInvitationMessage,
  validateInterviewInvitationDetails,
  type InterviewInvitationDetails,
} from "./interview-invitation-shared";
import { prisma } from "./prisma";
import {
  getEmailFrom,
  getResendClient,
  isResendConfigured,
} from "./resend-client";

export type { InterviewInvitationDetails } from "./interview-invitation-shared";
export {
  buildInterviewInvitationMessage,
  formatInterviewInvitationDate,
  formatInterviewInvitationTime,
  validateInterviewInvitationDetails,
} from "./interview-invitation-shared";

export type InterviewInvitationSendResult = {
  sent: boolean;
  email: string;
  ccEmails: string[];
  subject: string;
  message: string;
  devMode: boolean;
  error?: string;
};

const SUBJECT = "SMECC2E Scholarship Programme — Interview Invitation";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function invitationHtml(message: string, subject: string): string {
  return emailLayout({
    title: subject,
    preheader: subject,
    bodyHtml: `
      <div style="margin:0;font-size:14px;line-height:1.7;color:#334155;">
        ${escapeHtml(message).replace(/\r?\n/g, "<br />")}
      </div>
    `,
  });
}

async function listActiveCoordinatorEmails(
  excludeEmail?: string
): Promise<string[]> {
  const coordinators = await prisma.user.findMany({
    where: {
      role: "COORDINATOR",
      status: "ACTIVE",
    },
    select: { email: true },
    orderBy: { publicId: "asc" },
  });

  const exclude = excludeEmail ? normalizeEmail(excludeEmail) : "";
  const emails: string[] = [];
  const seen = new Set<string>();

  for (const coordinator of coordinators) {
    const email = normalizeEmail(coordinator.email ?? "");
    if (!email || !isValidEmail(email) || email === exclude) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}

export function interviewInvitationConfigurationError(): string | null {
  if (isResendConfigured()) return null;
  return "Email delivery is not configured. Add RESEND_API_KEY to send interview invitations.";
}

export async function sendInterviewInvitationEmail(options: {
  applicationRef: string;
  details: InterviewInvitationDetails;
}): Promise<InterviewInvitationSendResult> {
  const details = validateInterviewInvitationDetails(options.details);
  const message = buildInterviewInvitationMessage(details);
  const application = await getApplication(options.applicationRef);

  if (!application) {
    throw new Error("Application not found");
  }

  const email = applicantPrimaryEmail(application).trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Applicant does not have a valid email address");
  }

  const to = normalizeEmail(email);
  const ccEmails = await listActiveCoordinatorEmails(to);
  const resend = getResendClient();

  if (!resend) {
    console.log("[SMECC2E] Interview invitation (Resend not configured):");
    console.log({
      to,
      cc: ccEmails,
      subject: SUBJECT,
      applicant: applicantDisplayName(application),
      details,
    });
    return {
      sent: true,
      email: to,
      ccEmails,
      subject: SUBJECT,
      message,
      devMode: true,
    };
  }

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [to],
    ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
    subject: SUBJECT,
    text: message,
    html: invitationHtml(message, SUBJECT),
  });

  if (error) {
    return {
      sent: false,
      email: to,
      ccEmails,
      subject: SUBJECT,
      message,
      devMode: false,
      error: error.message ?? "Could not send interview invitation.",
    };
  }

  return {
    sent: true,
    email: to,
    ccEmails,
    subject: SUBJECT,
    message,
    devMode: false,
  };
}
