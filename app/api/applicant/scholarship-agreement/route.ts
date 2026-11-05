import { NextResponse } from "next/server";
import {
  ApplicantAuthError,
  requireApplicantPasswordChanged,
} from "@/lib/applicant-auth-service";
import { getApplication } from "@/lib/applications-service";
import { normalizeEmail } from "@/lib/email-verification-store";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import {
  getScholarshipAgreementForApplicant,
  submitScholarshipAgreement,
} from "@/lib/scholarship-agreement-service";

export const dynamic = "force-dynamic";

async function requireScholarApplication() {
  const user = await requireApplicantPasswordChanged();
  if (!user.application?.id) {
    throw new ApplicantAuthError("Application not found", 404);
  }

  const application = await getApplication(user.application.id);
  if (!application) {
    throw new ApplicantAuthError("Application not found", 404);
  }

  const sessionEmail = normalizeEmail(user.email);
  const appEmails = [application.email, application.personalEmail]
    .map((value) => normalizeEmail(value ?? ""))
    .filter(Boolean);
  if (!appEmails.includes(sessionEmail)) {
    throw new ApplicantAuthError("Forbidden", 403);
  }

  const allowed =
    application.status === "offered" ||
    application.status === "approved" ||
    application.status === "pre_departure" ||
    application.status === "reserved";

  if (!allowed) {
    throw new ApplicantAuthError(
      "Scholarship agreement is only available after nomination",
      400
    );
  }

  return { user, application };
}

function errorResponse(err: unknown, action: string) {
  if (err instanceof ApplicantAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof Error) {
    const message = err.message;
    if (
      message.includes("incomplete") ||
      message.includes("already been submitted") ||
      message.includes("only be submitted") ||
      message.includes("not found")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  console.error(`${action} /api/applicant/scholarship-agreement`, err);
  const connectionError = toUserFacingDatabaseError(err);
  return NextResponse.json(
    { error: connectionError ?? "Failed to load scholarship agreement" },
    { status: connectionError ? 503 : 500 }
  );
}

export async function GET() {
  try {
    const { application } = await requireScholarApplication();
    const form = await getScholarshipAgreementForApplicant(application.id);
    return NextResponse.json({
      form,
      submitted: Boolean(form),
      applicationStatus: application.status,
    });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

export async function POST(request: Request) {
  try {
    const { application } = await requireScholarApplication();
    const body = (await request.json()) as { form?: unknown };
    const form = await submitScholarshipAgreement({
      applicationRef: application.id,
      form: body.form,
    });
    return NextResponse.json({
      form,
      submitted: true,
      message: "Scholarship agreement submitted.",
    });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}
