import { NextResponse } from "next/server";
import type { EvaluatorReviewAction } from "@/lib/application-types";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { updateEvaluatorReview } from "@/lib/applications-service";
import type { EvaluatorEvaluationSubmission } from "@/lib/evaluator-evaluation-types";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

type RouteContext = { params: Promise<{ id: string }> };

const REVIEW_ACTIONS: EvaluatorReviewAction[] = [
  "accept",
  "reject",
  "evaluate",
  "reset",
];

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireDashboardSessionUser();
    if (user.role !== "Evaluator" && user.role !== "Administrator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: EvaluatorReviewAction;
      evaluation?: EvaluatorEvaluationSubmission;
    };
    if (!body.action || !REVIEW_ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const application = await updateEvaluatorReview(
      id,
      user.id,
      body.action,
      body.evaluation
    );
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
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
        message.includes("assigned") ||
        message.includes("accepted") ||
        message.includes("completed") ||
        message.includes("reset") ||
        message.includes("rejected") ||
        message.includes("scores") ||
        message.includes("Evaluation")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("PATCH /api/applications/[id]/evaluator-review", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to update evaluator review",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
