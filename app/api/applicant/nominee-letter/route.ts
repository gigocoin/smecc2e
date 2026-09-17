import { NextResponse } from "next/server";
import {
  ApplicantAuthError,
  requireApplicantPasswordChanged,
} from "@/lib/applicant-auth-service";
import { applicantPrimaryEmail } from "@/lib/application-types";
import { getApplication } from "@/lib/applications-service";
import { normalizeEmail } from "@/lib/email-verification-store";
import {
  decideNomineeLetterAgreement,
  getNomineeLetterData,
  signNomineeLetterAsScholarshipHolder,
} from "@/lib/nominee-letter-email";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

async function requireApplicantNominatedApplication(options?: {
  allowRejected?: boolean;
}) {
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
    (options?.allowRejected && application.status === "rejected");

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
      message.includes("not available") ||
      message.includes("is required") ||
      message.includes("only be signed") ||
      message.includes("only be decided") ||
      message.includes("already signed") ||
      message.includes("already responded") ||
      message.includes("must accept") ||
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
    const { application } = await requireApplicantNominatedApplication({
      allowRejected: true,
    });
    const letter = await getNomineeLetterData(application.id, "send");
    return NextResponse.json({
      letter,
      mode: "sign",
      applicationStatus: application.status,
      applicantEmail: applicantPrimaryEmail(application),
    });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      decision?: string;
      scholarshipHolderSignature?: string;
      scholarshipHolderSignedDate?: string;
    };

    if (body.action === "decide") {
      const { application } = await requireApplicantNominatedApplication();
      const decision =
        body.decision === "rejected"
          ? "rejected"
          : body.decision === "accepted"
            ? "accepted"
            : null;
      if (!decision) {
        return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
      }
      const result = await decideNomineeLetterAgreement({
        applicationRef: application.id,
        decision,
      });
      return NextResponse.json(result);
    }

    if (body.action === "sign") {
      const { application } = await requireApplicantNominatedApplication();
      const result = await signNomineeLetterAsScholarshipHolder({
        applicationRef: application.id,
        signature: body.scholarshipHolderSignature ?? "",
        signedDate: body.scholarshipHolderSignedDate ?? "",
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}
