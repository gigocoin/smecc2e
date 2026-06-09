import { NextResponse } from "next/server";
import {
  getActiveEvaluationRubric,
  isFullRubricMobility,
  resolveMobilityType,
  RUBRIC_TEMPLATE_MOBILITY,
  saveEvaluationRubric,
} from "@/lib/evaluation-rubric-service";
import type { EvaluationCategory } from "@/lib/evaluator-evaluation-rubric";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET(request: Request) {
  try {
    await requireDashboardSessionUser();
    const mobilityType = resolveMobilityType(
      new URL(request.url).searchParams.get("mobilityType")
    );
    const rubric = await getActiveEvaluationRubric(mobilityType);
    return NextResponse.json({
      mobilityType,
      rubric,
      templateMobility: RUBRIC_TEMPLATE_MOBILITY,
      questionsEditable: isFullRubricMobility(mobilityType),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/evaluation-rubric", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load evaluation rubric" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireDashboardSessionUser();
    if (user.role !== "Coordinator" && user.role !== "Administrator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      mobilityType?: string;
      rubric?: EvaluationCategory[];
    };
    if (!body.rubric || !Array.isArray(body.rubric)) {
      return NextResponse.json({ error: "Invalid rubric payload" }, { status: 400 });
    }

    const result = await saveEvaluationRubric(body.mobilityType ?? "", body.rubric);
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
        message.includes("Category") ||
        message.includes("Criterion") ||
        message.includes("rubric") ||
        message.includes("Duplicate")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("PATCH /api/evaluation-rubric", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ??
          (err instanceof Error
            ? err.message
            : "Failed to save evaluation rubric"),
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
