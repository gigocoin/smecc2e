import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
} from "@/lib/auth-service";
import {
  getNomineeLetterData,
  nomineeLetterConfigurationError,
  sendNomineeLetterEmail,
} from "@/lib/nominee-letter-email";
import { isResendConfigured } from "@/lib/resend-client";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(err: unknown, action: string) {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
      { status: err.status }
    );
  }
  if (err instanceof Error) {
    const message = err.message;
    if (
      message.includes("only be sent") ||
      message.includes("is required") ||
      message.includes("valid email") ||
      message.includes("not found")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  console.error(`${action} /api/applications/[id]/nominee-letter`, err);
  const connectionError = toUserFacingDatabaseError(err);
  return NextResponse.json(
    { error: connectionError ?? "Failed to prepare nomination letter" },
    { status: connectionError ? 503 : 500 }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCoordinatorOrAdministratorSessionUser();
    const { id } = await context.params;
    const letter = await getNomineeLetterData(id);
    return NextResponse.json({
      letter,
      ...(!isResendConfigured()
        ? { warning: nomineeLetterConfigurationError() }
        : {}),
    });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireCoordinatorOrAdministratorSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      hostUniversity?: string;
      mobilityType?: string;
      areaOfStudy?: string;
      durationMonths?: string;
      targetGroup?: string;
    };

    const result = await sendNomineeLetterEmail({
      applicationRef: id,
      fields: {
        hostUniversity: body.hostUniversity ?? "",
        mobilityType: body.mobilityType ?? "",
        areaOfStudy: body.areaOfStudy ?? "",
        durationMonths: body.durationMonths ?? "",
        targetGroup: body.targetGroup ?? "",
      },
      initiatorEmail: user.email,
      initiatorName: user.name,
    });

    if (!result.sent) {
      return NextResponse.json(
        { error: result.error ?? "Could not send nomination letter." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...result,
      ...(!isResendConfigured()
        ? { warning: nomineeLetterConfigurationError() }
        : {}),
    });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}
