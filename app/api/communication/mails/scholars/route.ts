import { NextResponse } from "next/server";
import {
  scholarMailConfigurationError,
  sendScholarMails,
  type ScholarMailSendMode,
} from "@/lib/communication-scholar-mail-service";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
} from "@/lib/auth-service";
import { isResendConfigured } from "@/lib/resend-client";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

function isScholarMailSendMode(value: unknown): value is ScholarMailSendMode {
  return value === "all" || value === "single" || value === "selected";
}

export async function POST(request: Request) {
  try {
    const user = await requireCoordinatorOrAdministratorSessionUser();
    const body = (await request.json()) as {
      mode?: ScholarMailSendMode;
      subject?: string;
      message?: string;
      scholarIds?: string[];
    };

    if (!isScholarMailSendMode(body.mode)) {
      return NextResponse.json(
        { error: "Invalid recipient mode" },
        { status: 400 }
      );
    }

    if (!isResendConfigured()) {
      const result = await sendScholarMails({
        mode: body.mode,
        subject: body.subject ?? "",
        message: body.message ?? "",
        scholarIds: body.scholarIds,
        senderName: user.name,
      });

      return NextResponse.json({
        ...result,
        warning: scholarMailConfigurationError(),
      });
    }

    const result = await sendScholarMails({
      mode: body.mode,
      subject: body.subject ?? "",
      message: body.message ?? "",
      scholarIds: body.scholarIds,
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
        message.includes("scholar") ||
        message.includes("recipient")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("POST /api/communication/mails/scholars", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: connectionError ?? "Failed to send scholar email",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
