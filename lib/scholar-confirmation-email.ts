import type { ApplicationRecord } from "./application-types";
import { getApplication, updateApplicationStatus } from "./applications-service";
import {
  getEmailFrom,
  getResendClient,
} from "./resend-client";
import { buildScholarConfirmation } from "./scholar-confirmation-shared";

export type ScholarConfirmationSendResult = {
  sent: boolean;
  devMode: boolean;
  email: string;
  subject: string;
  application?: ApplicationRecord;
  error?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

export async function sendScholarConfirmationEmail(options: {
  applicationRef: string;
  baseUrl: string;
}): Promise<ScholarConfirmationSendResult> {
  const application = await getApplication(options.applicationRef);
  if (!application) {
    throw new Error("Application not found");
  }
  if (application.status !== "offered") {
    throw new Error("Only nominated applicants can be confirmed as scholars");
  }

  const preview = buildScholarConfirmation(application, options.baseUrl);
  if (!preview.to || !isValidEmail(preview.to)) {
    throw new Error("This nominee does not have a valid email address");
  }

  const resend = getResendClient();
  if (!resend) {
    console.log("[SMECC2E] Scholar confirmation (Resend not configured):");
    console.log({
      to: preview.to,
      subject: preview.subject,
      applicant: preview.recipientName,
    });
  } else {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: [preview.to],
      subject: preview.subject,
      text: preview.text,
      html: preview.html,
    });
    if (error) {
      return {
        sent: false,
        devMode: false,
        email: preview.to,
        subject: preview.subject,
        error: error.message ?? "Could not send the confirmation email.",
      };
    }
  }

  const updated = await updateApplicationStatus(application.id, "approved");
  if (!updated) {
    throw new Error("Application not found");
  }

  return {
    sent: true,
    devMode: !resend,
    email: preview.to,
    subject: preview.subject,
    application: updated,
  };
}
