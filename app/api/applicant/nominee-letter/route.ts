import { NextResponse } from "next/server";
import {
  ApplicantAuthError,
  requireApplicantPasswordChanged,
} from "@/lib/applicant-auth-service";
import { applicantPrimaryEmail } from "@/lib/application-types";
import { getApplication } from "@/lib/applications-service";
import { normalizeEmail } from "@/lib/email-verification-store";
import {
  getNomineeLetterData,
  signNomineeLetterAsScholarshipHolder,
} from "@/lib/nominee-letter-email";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

async function requireApplicantNominatedApplication() {
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

  if (
    application.status !== "offered" &&
    application.status !== "approved" &&
    application.status !== "pre_departure"
  ) {
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
      message.includes("not available") ||
      message.includes("is required") ||
      message.includes("only be signed") ||
      message.includes("already signed") ||
      message.includes("not found") ||
      message.includes("has not shared")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  console.error(`${action} /api/applicant/nominee-letter`, err);
  const connectionError = toUserFacingDatabaseError(err);
  return NextResponse.json(
    { error: connectionError ?? "Failed to load scholarship agreement" },
    { status: connectionError ? 503 : 500 }
  );
}

export async function GET() {
  try {
    const { application } = await requireApplicantNominatedApplication();
    const letter = await getNomineeLetterData(application.id, "send");
    return NextResponse.json({
      letter,
      mode: "sign",
      applicantEmail: applicantPrimaryEmail(application),
    });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

export async function POST(request: Request) {
  try {
    const { application } = await requireApplicantNominatedApplication();
    const body = (await request.json()) as {
      action?: string;
      scholarshipHolderSignature?: string;
      scholarshipHolderSignedDate?: string;
    };

    if (body.action !== "sign") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await signNomineeLetterAsScholarshipHolder({
      applicationRef: application.id,
      signature: body.scholarshipHolderSignature ?? "",
      signedDate: body.scholarshipHolderSignedDate ?? "",
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, "POST");
  }
}
