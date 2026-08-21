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

const SUBJECT_BASE = "SMECC2E Scholarship Programme — Interview Invitation";

function buildInterviewInvitationSubject(initiatorName?: string | null): string {
  const name = initiatorName?.trim();
  if (!name) return SUBJECT_BASE;
  return `${SUBJECT_BASE} from ${name}`;
}

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

function buildCcEmails(options: {
  applicantEmail: string;
  coordinatorEmails: string[];
  initiatorEmail?: string | null;
}): string[] {
  const exclude = normalizeEmail(options.applicantEmail);
  const emails: string[] = [];
  const seen = new Set<string>();

  const add = (value: string | null | undefined) => {
    const email = normalizeEmail(value ?? "");
    if (!email || !isValidEmail(email) || email === exclude) return;
    if (seen.has(email)) return;
    seen.add(email);
    emails.push(email);
  };

  for (const email of options.coordinatorEmails) {
    add(email);
  }
  add(options.initiatorEmail);

  return emails;
}

export function interviewInvitationConfigurationError(): string | null {
  if (isResendConfigured()) return null;
  return "Email delivery is not configured. Add RESEND_API_KEY to send interview invitations.";
}

export async function sendInterviewInvitationEmail(options: {
  applicationRef: string;
  details: InterviewInvitationDetails;
  /** Administrator (or coordinator) who sent the invitation — receives a CC copy. */
  initiatorEmail?: string | null;
  /** Full name of the administrator who sent the invitation (used in the email subject). */
  initiatorName?: string | null;
}): Promise<InterviewInvitationSendResult> {
  const details = validateInterviewInvitationDetails(options.details);
  const message = buildInterviewInvitationMessage(
    details,
    options.initiatorEmail
  );
  const subject = buildInterviewInvitationSubject(options.initiatorName);
  const application = await getApplication(options.applicationRef);

  if (!application) {
    throw new Error("Application not found");
  }

  const email = applicantPrimaryEmail(application).trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Applicant does not have a valid email address");
  }

  const to = normalizeEmail(email);
  const coordinatorEmails = await listActiveCoordinatorEmails(to);
  const ccEmails = buildCcEmails({
    applicantEmail: to,
    coordinatorEmails,
    initiatorEmail: options.initiatorEmail,
  });
  const resend = getResendClient();

  if (!resend) {
    console.log("[SMECC2E] Interview invitation (Resend not configured):");
    console.log({
      to,
      cc: ccEmails,
      subject,
      applicant: applicantDisplayName(application),
      details,
    });
    return {
      sent: true,
      email: to,
      ccEmails,
      subject,
      message,
      devMode: true,
    };
  }

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [to],
    ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
    subject,
    text: message,
    html: invitationHtml(message, subject),
  });

  if (error) {
    return {
      sent: false,
      email: to,
      ccEmails,
      subject,
      message,
      devMode: false,
      error: error.message ?? "Could not send interview invitation.",
    };
  }

  return {
    sent: true,
    email: to,
    ccEmails,
    subject,
    message,
    devMode: false,
  };
}
