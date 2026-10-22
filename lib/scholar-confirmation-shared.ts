import {
  applicantPrimaryEmail,
  type ApplicationPayload,
  type ApplicationRecord,
} from "./application-types";
import {
  emailButton,
  emailDetailsTable,
  emailLayout,
  escapeHtml,
} from "./email-layout";

const SMECC2E_WEBSITE = "smecc2e.unn.edu.ng";
const SMECC2E_EMAIL = "smecc2e@unn.edu.ng";

export type ScholarConfirmationPreview = {
  to: string;
  recipientName: string;
  subject: string;
  text: string;
  html: string;
  loginUrl: string;
};

type ConfirmationSource = Pick<
  ApplicationRecord,
  | "id"
  | "firstName"
  | "middleName"
  | "surname"
  | "email"
  | "personalEmail"
  | "typeOfMobility"
  | "preferredHostInstitution"
  | "proposedAcademicProgramme"
> &
  Partial<
    Pick<
      ApplicationRecord,
      | "nomineeHostUniversity"
      | "nomineeMobilityType"
      | "nomineeDurationMonths"
      | "nomineeAreaOfStudy"
    >
  >;

function displayValue(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? "";
  if (
    !trimmed ||
    trimmed === "—" ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "[pending]"
  ) {
    return "";
  }
  return trimmed;
}

export function scholarConfirmationRecipientName(
  app: Pick<ApplicationPayload, "firstName" | "middleName" | "surname">
): string {
  return (
    [app.firstName, app.middleName, app.surname].filter(Boolean).join(" ").trim() ||
    "Scholar"
  );
}

export function scholarConfirmationSubject(applicationId: string): string {
  return `SMECC2E scholarship confirmation — ${applicationId}`;
}

export function scholarPortalLoginUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/scholar/login`;
}

export function buildScholarConfirmation(
  app: ConfirmationSource,
  baseUrl: string
): ScholarConfirmationPreview {
  const recipientName = scholarConfirmationRecipientName(app);
  const greetingName = app.firstName.trim() || recipientName;
  const loginUrl = scholarPortalLoginUrl(baseUrl);
  const mobility =
    displayValue(app.nomineeMobilityType) || displayValue(app.typeOfMobility);
  const host =
    displayValue(app.nomineeHostUniversity) ||
    displayValue(app.preferredHostInstitution);
  const programme =
    displayValue(app.nomineeAreaOfStudy) ||
    displayValue(app.proposedAcademicProgramme);
  const durationMonths = displayValue(app.nomineeDurationMonths);
  const duration = durationMonths ? `${durationMonths} months` : "";
  const subject = scholarConfirmationSubject(app.id);

  const detailLines = [
    `Application reference: ${app.id}`,
    mobility ? `Mobility: ${mobility}` : "",
    host ? `Host institution: ${host}` : "",
    programme ? `Programme / area of study: ${programme}` : "",
    duration ? `Duration: ${duration}` : "",
  ].filter(Boolean);

  const text = [
    "SCHOLARSHIP CONFIRMATION",
    "",
    `Dear ${greetingName},`,
    "",
    "We are pleased to confirm your selection as a scholar on the Sustainable Energy & Materials, Energy Policy, Climate Change, Energy Economics and Environment (SMECC2E) Intra-Africa Mobility Project.",
    "",
    "Your nomination has been confirmed. A scholar record is now open for you, and you can complete onboarding in the scholar portal.",
    "",
    ...detailLines,
    "",
    "What you should do next",
    "",
    "Sign in to the scholar portal with the email address and password you already use for your applicant account:",
    loginUrl,
    "",
    "Then complete these onboarding forms:",
    "1. Scholarship acceptance and funding declaration",
    "2. Scholarship agreement / e-signature",
    "3. Personal and contact information update",
    "4. Mobility details confirmation",
    "5. Photo and publication consent",
    "",
    "Please complete them promptly so pre-departure arrangements can begin.",
    "",
    `If you need help, write to the SMECC2E Project Team at ${SMECC2E_EMAIL}.`,
    "",
    "Kind regards,",
    "SMECC2E Project Team",
    "University of Nigeria (Project Coordinator)",
    `Website: ${SMECC2E_WEBSITE}`,
    `Email: ${SMECC2E_EMAIL}`,
  ].join("\n");

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:800;letter-spacing:0.04em;color:#062763;text-transform:uppercase;">
      Scholarship confirmation
    </h1>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      Dear ${escapeHtml(greetingName)},
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      We are pleased to confirm your selection as a scholar on the Sustainable Energy &amp; Materials, Energy Policy, Climate Change, Energy Economics and Environment (SMECC2E) Intra-Africa Mobility Project.
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
      Your nomination has been confirmed. A scholar record is now open for you, and you can complete onboarding in the scholar portal.
    </p>
    ${emailDetailsTable([
      { label: "Application reference", value: app.id },
      { label: "Mobility", value: mobility },
      { label: "Host institution", value: host },
      { label: "Programme / area of study", value: programme },
      { label: "Duration", value: duration },
    ])}
    <h2 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#062763;">
      What you should do next
    </h2>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#334155;">
      Sign in to the scholar portal with the email address and password you already use for your applicant account.
    </p>
    ${emailButton(loginUrl, "Open scholar portal")}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#334155;">
      Then complete these onboarding forms:
    </p>
    <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.6;color:#334155;">
      <li>Scholarship acceptance and funding declaration</li>
      <li>Scholarship agreement / e-signature</li>
      <li>Personal and contact information update</li>
      <li>Mobility details confirmation</li>
      <li>Photo and publication consent</li>
    </ol>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
      Please complete them promptly so pre-departure arrangements can begin.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
      Kind regards,<br />
      <strong>SMECC2E Project Team</strong><br />
      University of Nigeria (Project Coordinator)<br />
      Website: <a href="https://${escapeHtml(SMECC2E_WEBSITE)}" style="color:#062763;font-weight:600;">${escapeHtml(SMECC2E_WEBSITE)}</a><br />
      Email: <a href="mailto:${escapeHtml(SMECC2E_EMAIL)}" style="color:#062763;font-weight:600;">${escapeHtml(SMECC2E_EMAIL)}</a>
    </p>
  `;

  return {
    to: applicantPrimaryEmail(app).trim(),
    recipientName,
    subject,
    text,
    html: emailLayout({
      title: "Scholarship confirmation",
      preheader: `Your SMECC2E scholarship for ${app.id} is confirmed.`,
      bodyHtml,
    }),
    loginUrl,
  };
}
