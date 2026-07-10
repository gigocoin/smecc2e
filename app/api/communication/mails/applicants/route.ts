import { NextResponse } from "next/server";
import {
  applicantMailConfigurationError,
  sendApplicantMails,
  type ApplicantMailSendMode,
} from "@/lib/communication-applicant-mail-service";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
} from "@/lib/auth-service";
import { isResendConfigured } from "@/lib/resend-client";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

function isApplicantMailSendMode(value: unknown): value is ApplicantMailSendMode {
  return (
    value === "all" ||
    value === "single" ||
    value === "selected" ||
    value === "eligibility_checks" ||
    value === "draft"
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireCoordinatorOrAdministratorSessionUser();
    const body = (await request.json()) as {
      mode?: ApplicantMailSendMode;
      subject?: string;
      message?: string;
      applicationIds?: string[];
    };

    if (!isApplicantMailSendMode(body.mode)) {
      return NextResponse.json(
        { error: "Invalid recipient mode" },
        { status: 400 }
      );
    }

    if (!isResendConfigured()) {
      const result = await sendApplicantMails({
        mode: body.mode,
        subject: body.subject ?? "",
        message: body.message ?? "",
        applicationIds: body.applicationIds,
        senderName: user.name,
      });

      return NextResponse.json({
        ...result,
        warning: applicantMailConfigurationError(),
      });
    }

    const result = await sendApplicantMails({
      mode: body.mode,
      subject: body.subject ?? "",
      message: body.message ?? "",
      applicationIds: body.applicationIds,
      senderName: user.name,
    });

    if (result.sent === 0 && result.failed > 0) {
      return NextResponse.json(
        {
          error: "Could not send email to any recipients",
          ...result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    if (err instanceof Error) {
      const message = err.message;
      if (
        message.includes("subject") ||
        message.includes("message") ||
        message.includes("Select") ||
        message.includes("recipient")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("POST /api/communication/mails/applicants", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: connectionError ?? "Failed to send applicant email",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
