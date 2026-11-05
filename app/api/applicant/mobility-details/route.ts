import { NextResponse } from "next/server";
import {
  ApplicantAuthError,
  requireApplicantPasswordChanged,
} from "@/lib/applicant-auth-service";
import { getApplication } from "@/lib/applications-service";
import { normalizeEmail } from "@/lib/email-verification-store";
import {
  getMobilityDetailsForApplicant,
  submitMobilityDetails,
} from "@/lib/mobility-details-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

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
      "Mobility details confirmation is only available after nomination",
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
  console.error(`${action} /api/applicant/mobility-details`, err);
  const connectionError = toUserFacingDatabaseError(err);
  return NextResponse.json(
    { error: connectionError ?? "Failed to load mobility details confirmation" },
    { status: connectionError ? 503 : 500 }
  );
}

export async function GET() {
  try {
    const { application } = await requireScholarApplication();
    const form = await getMobilityDetailsForApplicant(application.id);
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
    const form = await submitMobilityDetails({
      applicationRef: application.id,
      form: body.form,
    });
    return NextResponse.json({
      form,
      submitted: true,
      message: "Mobility details confirmation submitted.",
    });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}
