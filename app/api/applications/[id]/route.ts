import { NextResponse } from "next/server";
import type { ApplicationStatus } from "@/lib/application-types";
import { COORDINATOR_APPLICATION_STATUSES } from "@/lib/application-types";
import {
  AuthError,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import { requireApplicantOwnsApplication } from "@/lib/applicant-application-auth";
import { ApplicantAuthError } from "@/lib/applicant-auth-service";
import {
  getApplication,
  isApplicationAssignedToEvaluator,
  updateApplicationStatus,
  assignApplicationEvaluator,
  assignApplicationInterviewer,
  deleteApplication,
} from "@/lib/applications-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const application = await getApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (application.status === "draft") {
      await requireApplicantOwnsApplication(application.id);
    } else {
      const user = await requireDashboardSessionUser();
      if (user.role === "Evaluator") {
        const assigned = await isApplicationAssignedToEvaluator(id, user.id);
        if (!assigned) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
      }
    }
    return NextResponse.json({ application });
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/applications/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load application from database",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireDashboardSessionUser();
    if (user.role === "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: ApplicationStatus;
      evaluator1Id?: string | null;
      evaluator2Id?: string | null;
      interviewerId?: string | null;
    };

    const hasEvaluatorUpdate =
      body.evaluator1Id !== undefined || body.evaluator2Id !== undefined;
    const hasInterviewerUpdate = body.interviewerId !== undefined;

    if (
      body.status === undefined &&
      !hasEvaluatorUpdate &&
      !hasInterviewerUpdate
    ) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    if (body.status !== undefined) {
      if (!COORDINATOR_APPLICATION_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const application = await updateApplicationStatus(id, body.status);
      if (!application) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!hasEvaluatorUpdate) {
        return NextResponse.json({ application });
      }
    }

    if (body.evaluator1Id !== undefined) {
      const application = await assignApplicationEvaluator(
        id,
        1,
        body.evaluator1Id
      );
      if (!application) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (body.evaluator2Id === undefined) {
        return NextResponse.json({ application });
      }
    }

    if (body.evaluator2Id !== undefined) {
      const application = await assignApplicationEvaluator(
        id,
        2,
        body.evaluator2Id
      );
      if (!application) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ application });
    }

    if (body.interviewerId !== undefined) {
      const application = await assignApplicationInterviewer(
        id,
        body.interviewerId
      );
      if (!application) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ application });
    }

    const application = await getApplication(id);
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
    if (err instanceof Error && err.message.toLowerCase().includes("evaluator")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message.toLowerCase().includes("interviewer")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/applications/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to update application",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireDashboardSessionUser();
    if (user.role === "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await context.params;
    const deleted = await deleteApplication(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("DELETE /api/applications/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to delete application",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
