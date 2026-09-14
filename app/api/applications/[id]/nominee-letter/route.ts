import { NextResponse } from "next/server";
import {
  AuthError,
  requireAdministratorSessionUser,
  requireCoordinatorOrAdministratorSessionUser,
  requireCoordinatorSessionUser,
} from "@/lib/auth-service";
import {
  getNomineeLetterData,
  nomineeLetterConfigurationError,
  sendNomineeLetterEmail,
  shareNomineeLetterEmail,
  signNomineeLetterAsHostContact,
  type NomineeLetterMode,
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
      message.includes("is invalid") ||
      message.includes("valid email") ||
      message.includes("not found") ||
      message.includes("has not shared") ||
      message.includes("already signed") ||
      message.includes("must sign")
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
    const user = await requireCoordinatorOrAdministratorSessionUser();
    const { id } = await context.params;
    const mode: NomineeLetterMode =
      user.role === "Administrator" ? "send" : "share";

    const letter = await getNomineeLetterData(id, mode);
    return NextResponse.json({
      letter,
      mode,
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
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      hostUniversity?: string;
      mobilityType?: string;
      areaOfStudy?: string;
      durationMonths?: string;
      targetGroup?: string;
      holderType?: string;
      mobilityActivity?: string;
      mobilityStartDate?: string;
      mobilityEndDate?: string;
      planDocument?: string;
      learningDocument?: string;
      changesDocument?: string;
      staffPlanDocument?: string;
      subsistenceAllowance?: string;
      scholarshipHolderSignature?: string;
      scholarshipHolderSignedDate?: string;
      hostContactSignature?: string;
      hostContactSignedDate?: string;
      letterDate?: string;
    };
    const action =
      body.action === "send"
        ? "send"
        : body.action === "sign-host"
          ? "sign-host"
          : "share";

    if (action === "share") {
      const user = await requireCoordinatorSessionUser();
      const result = await shareNomineeLetterEmail({
        applicationRef: id,
        fields: {
          hostUniversity: body.hostUniversity ?? "",
          mobilityType: body.mobilityType ?? "",
          areaOfStudy: body.areaOfStudy ?? "",
          durationMonths: body.durationMonths ?? "",
          targetGroup: body.targetGroup ?? "",
          holderType: body.holderType ?? "",
          mobilityActivity: body.mobilityActivity ?? "",
          mobilityStartDate: body.mobilityStartDate ?? "",
          mobilityEndDate: body.mobilityEndDate ?? "",
          planDocument: body.planDocument ?? "",
          learningDocument: body.learningDocument ?? "",
          changesDocument: body.changesDocument ?? "",
          staffPlanDocument: body.staffPlanDocument ?? "",
          subsistenceAllowance: body.subsistenceAllowance ?? "",
          scholarshipHolderSignature: "",
          scholarshipHolderSignedDate: "",
          hostContactSignature: "",
          hostContactSignedDate: "",
        },
        initiatorEmail: user.email,
        initiatorName: user.name,
      });

      if (!result.sent) {
        return NextResponse.json(
          { error: result.error ?? "Could not share nomination letter." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ...result,
        ...(!isResendConfigured()
          ? { warning: nomineeLetterConfigurationError() }
          : {}),
      });
    }

    if (action === "sign-host") {
      await requireAdministratorSessionUser();
      const result = await signNomineeLetterAsHostContact({
        applicationRef: id,
        signature: body.hostContactSignature ?? "",
        signedDate: body.hostContactSignedDate ?? "",
      });
      return NextResponse.json(result);
    }

    const user = await requireAdministratorSessionUser();
    const result = await sendNomineeLetterEmail({
      applicationRef: id,
      letterDateInput: body.letterDate ?? "",
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
