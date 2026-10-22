import { NextResponse } from "next/server";
import { AuthError, requireCoordinatorSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { sendScholarConfirmationEmail } from "@/lib/scholar-confirmation-email";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function resolveBaseUrl(request: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERIFICATION_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin.replace(/\/$/, "");
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCoordinatorSessionUser();
    const { id } = await context.params;
    const result = await sendScholarConfirmationEmail({
      applicationRef: id,
      baseUrl: resolveBaseUrl(request),
    });

    if (!result.sent || !result.application) {
      return NextResponse.json(
        { error: result.error ?? "Could not send the confirmation email." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      application: result.application,
      email: result.email,
      subject: result.subject,
      devMode: result.devMode,
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
        message.includes("not found") ||
        message.includes("valid email") ||
        message.includes("nominated applicants")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("POST /api/applications/[id]/scholar-confirmation", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: connectionError ?? "Failed to send the confirmation email",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
