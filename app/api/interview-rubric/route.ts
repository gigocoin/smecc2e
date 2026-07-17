import { NextResponse } from "next/server";
import type { InterviewCriterion } from "@/lib/interview-criterion-weights";
import {
  getActiveInterviewCriteria,
  saveInterviewCriteria,
} from "@/lib/interview-rubric-service";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const criteria = await getActiveInterviewCriteria();
    return NextResponse.json({ criteria }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/interview-rubric", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load interview rubric" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireDashboardSessionUser();
    if (user.role !== "Coordinator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { criteria?: InterviewCriterion[] };
    if (!body.criteria || !Array.isArray(body.criteria)) {
      return NextResponse.json(
        { error: "Invalid interview rubric payload" },
        { status: 400 }
      );
    }

    const criteria = await saveInterviewCriteria(body.criteria);
    return NextResponse.json({ criteria }, { headers: NO_STORE_HEADERS });
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
        message.includes("Criterion") ||
        message.includes("rubric") ||
        message.includes("Duplicate")
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    console.error("PATCH /api/interview-rubric", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ??
          (err instanceof Error
            ? err.message
            : "Failed to save interview rubric"),
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
