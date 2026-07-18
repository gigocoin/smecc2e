import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  createProjectMilestone,
  createProjectMilestonesBulk,
  deleteAllProjectMilestones,
  listProjectMilestones,
  saveProjectMilestones,
  type CreateProjectMilestoneInput,
  type ProjectMilestoneInput,
} from "@/lib/project-milestones-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const milestones = await listProjectMilestones();
    return NextResponse.json({ milestones });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/project-milestones", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load milestones" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as
      | CreateProjectMilestoneInput
      | { milestones?: CreateProjectMilestoneInput[] };

    if (
      body &&
      typeof body === "object" &&
      "milestones" in body &&
      Array.isArray(body.milestones)
    ) {
      const milestones = await createProjectMilestonesBulk(body.milestones);
      return NextResponse.json(
        { milestones, created: milestones.length },
        { status: 201 }
      );
    }

    const milestone = await createProjectMilestone(
      body as CreateProjectMilestoneInput
    );
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/project-milestones", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create milestone";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as {
      milestones?: ProjectMilestoneInput[];
    };
    if (!body || !Array.isArray(body.milestones)) {
      return NextResponse.json(
        { error: 'Body must include a "milestones" array.' },
        { status: 400 }
      );
    }
    const milestones = await saveProjectMilestones(body.milestones);
    return NextResponse.json({ milestones, saved: milestones.length });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PUT /api/project-milestones", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to save milestones";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await requireCoordinatorSessionUser();
    const deleted = await deleteAllProjectMilestones();
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("DELETE /api/project-milestones", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to delete milestones" },
      { status: connectionError ? 503 : 500 }
    );
  }
}
