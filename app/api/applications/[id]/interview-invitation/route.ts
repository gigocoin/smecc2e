import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
} from "@/lib/auth-service";
import {
  interviewInvitationConfigurationError,
  sendInterviewInvitationEmail,
} from "@/lib/interview-invitation-email";
import { isResendConfigured } from "@/lib/resend-client";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireCoordinatorOrAdministratorSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      date?: string;
      time?: string;
      venue?: string;
    };

    const result = await sendInterviewInvitationEmail({
      applicationRef: id,
      details: {
        date: body.date ?? "",
        time: body.time ?? "",
        venue: body.venue ?? "",
      },
      initiatorEmail: user.email,
      initiatorName: user.name,
    });

    if (!result.sent) {
      return NextResponse.json(
        { error: result.error ?? "Could not send interview invitation." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...result,
      ...(!isResendConfigured()
        ? { warning: interviewInvitationConfigurationError() }
        : {}),
    });
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
        message.includes("required") ||
        message.includes("valid email") ||
        message.includes("not found") ||
        message.includes("Assign an interviewer")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("POST /api/applications/[id]/interview-invitation", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: connectionError ?? "Failed to send interview invitation",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
