import type { ApplicationRecord } from "./application-types";
import { applicantPrimaryEmail } from "./application-types";
import { emailLayout, escapeHtml } from "./email-layout";
import {
  getEmailFrom,
  getResendClient,
  isResendConfigured,
  type SendEmailResult,
} from "./resend-client";

const SMECC2E_WEBSITE = "smecc2e.unn.edu.ng";
const SMECC2E_EMAIL = "smecc2e@unn.edu.ng";

function confirmationEmailText(
  application: ApplicationRecord,
  mobilityCategory: string
): string {
  return [
    "APPLICATION SUCCESSFULLY SUBMITTED",
    "",
    "Dear Applicant,",
    "",
    "Thank you for submitting your application to the Sustainable Energy & Materials, Energy Policy, Climate Change, Energy Economics and Environment (SMECC2E) Intra-Africa Mobility Project.",
    "",
    `We are pleased to confirm that your application has been successfully received and recorded in our system under the mobility category you selected: ${mobilityCategory}.`,
    "",
    `Application reference: ${application.id}`,
    "",
    "What Happens Next?",
    "",
    "Your application will now proceed through the following stages:",
    "",
    "1. Administrative Screening",
    "Your application will be reviewed to confirm completeness, eligibility, and submission of all mandatory documents.",
    "",
    "2. Technical Evaluation",
    "Eligible applications will undergo a merit-based evaluation by the SMECC2E Selection Committee using established academic and selection criteria.",
    "",
    "3. Ranking and Selection",
    "Applicants will be ranked according to their evaluation scores, while ensuring transparency, fairness, gender balance, and inclusion considerations.",
    "",
    "4. Notification of Outcome",
    "Only shortlisted and selected candidates will be contacted via the email address provided in your application. Results may also be published through the official SMECC2E communication channels.",
    "",
    "Important Notice",
    "Please retain a copy of your submitted application and supporting documents for your records.",
    "You may be contacted if clarification or additional information is required during the evaluation process.",
    "Submission of an application does not automatically guarantee selection for the scholarship.",
    "",
    "We appreciate your interest in the SMECC2E Project and your commitment to advancing knowledge and innovation in Sustainable Energy, Climate Change, Energy Economics, Environment, and related fields in Africa.",
    "",
    "We wish you success in the selection process.",
    "",
    "SMECC2E Project Team",
    "University of Nigeria (Project Coordinator)",
    `Website: ${SMECC2E_WEBSITE}`,
    `Email: ${SMECC2E_EMAIL}`,
  ].join("\n");
}

function confirmationEmailHtml(
  application: ApplicationRecord,
  mobilityCategory: string
): string {
  const stageStyle =
    "margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;";
  const listStyle =
    "margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.6;color:#334155;";

  return `
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:800;letter-spacing:0.04em;color:#062763;text-transform:uppercase;">
      Application successfully submitted
    </h1>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      Dear Applicant,
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      Thank you for submitting your application to the Sustainable Energy &amp; Materials, Energy Policy, Climate Change, Energy Economics and Environment (SMECC2E) Intra-Africa Mobility Project.
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      We are pleased to confirm that your application has been successfully received and recorded in our system under the mobility category you selected: <strong>${escapeHtml(mobilityCategory)}</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
      Your application reference is <strong>${escapeHtml(application.id)}</strong>.
    </p>

    <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#062763;">
      What Happens Next?
    </h2>
    <p style="${stageStyle}">
      Your application will now proceed through the following stages:
    </p>
    <ol style="${listStyle}">
      <li style="margin-bottom:14px;">
        <strong>Administrative Screening</strong><br />
        Your application will be reviewed to confirm completeness, eligibility, and submission of all mandatory documents.
      </li>
      <li style="margin-bottom:14px;">
        <strong>Technical Evaluation</strong><br />
        Eligible applications will undergo a merit-based evaluation by the SMECC2E Selection Committee using established academic and selection criteria.
      </li>
      <li style="margin-bottom:14px;">
        <strong>Ranking and Selection</strong><br />
        Applicants will be ranked according to their evaluation scores, while ensuring transparency, fairness, gender balance, and inclusion considerations.
      </li>
      <li>
        <strong>Notification of Outcome</strong><br />
        Only shortlisted and selected candidates will be contacted via the email address provided in your application. Results may also be published through the official SMECC2E communication channels.
      </li>
    </ol>

    <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#062763;">
      Important Notice
    </h2>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.6;color:#334155;">
      <li style="margin-bottom:8px;">
        Please retain a copy of your submitted application and supporting documents for your records.
      </li>
      <li style="margin-bottom:8px;">
        You may be contacted if clarification or additional information is required during the evaluation process.
      </li>
      <li>
        Submission of an application does not automatically guarantee selection for the scholarship.
      </li>
    </ul>

    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      We appreciate your interest in the SMECC2E Project and your commitment to advancing knowledge and innovation in Sustainable Energy, Climate Change, Energy Economics, Environment, and related fields in Africa.
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
      We wish you success in the selection process.
    </p>

    <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
      <strong>SMECC2E Project Team</strong><br />
      University of Nigeria (Project Coordinator)<br />
      Website: <a href="https://${escapeHtml(SMECC2E_WEBSITE)}" style="color:#062763;font-weight:600;">${escapeHtml(SMECC2E_WEBSITE)}</a><br />
      Email: <a href="mailto:${escapeHtml(SMECC2E_EMAIL)}" style="color:#062763;font-weight:600;">${escapeHtml(SMECC2E_EMAIL)}</a>
    </p>
  `;
}

export async function sendApplicationConfirmationEmail(
  application: ApplicationRecord
): Promise<SendEmailResult> {
  const to = applicantPrimaryEmail(application).trim();
  if (!to) {
    return { sent: false, error: "No applicant email on record." };
  }

  const resend = getResendClient();
  if (!resend) {
    console.log(
      "[SMECC2E] Application confirmation (Resend not configured) for:",
      application.id,
      "→",
      to
    );
    return {
      sent: false,
      error: "Resend is not configured. Confirmation email was not sent.",
    };
  }

  const mobilityCategory = application.typeOfMobility.trim() || "Not specified";
  const text = confirmationEmailText(application, mobilityCategory);
  const bodyHtml = confirmationEmailHtml(application, mobilityCategory);

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: [to],
      subject: `Application successfully submitted — ${application.id}`,
      text,
      html: emailLayout({
        title: "Application successfully submitted",
        preheader: `Your SMECC2E application ${application.id} has been received.`,
        bodyHtml,
      }),
    });

    if (error) {
      console.error("[SMECC2E] Resend application confirmation failed:", error);
      return {
        sent: false,
        error: error.message ?? "Could not send confirmation email.",
      };
    }

    return { sent: true };
  } catch (err) {
    console.error("[SMECC2E] Resend application confirmation error:", err);
    return {
      sent: false,
      error: "Could not send confirmation email.",
    };
  }
}

export { isResendConfigured };
