import { NextResponse } from "next/server";
import type { InterviewEvaluationSubmission } from "@/lib/interview-scoring-sheet";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import {
  getInterviewScoreSummary,
  submitInterviewScore,
} from "@/lib/applications-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireDashboardSessionUser();
    const { id } = await context.params;
    const summary = await getInterviewScoreSummary(id, user);
    if (!summary) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(summary, { headers: NO_STORE_HEADERS });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/applications/[id]/interview", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load interview score summary",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireDashboardSessionUser();
    if (user.role !== "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      interviewScore?: number;
      interviewEvaluationData?: InterviewEvaluationSubmission;
    };

    if (body.interviewScore === undefined) {
      return NextResponse.json(
        { error: "Interview score is required" },
        { status: 400 }
      );
    }

    const application = await submitInterviewScore(
      id,
      user.id,
      body.interviewScore,
      body.interviewEvaluationData
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
    if (err instanceof Error && /interview/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/applications/[id]/interview", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to save interview score",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
