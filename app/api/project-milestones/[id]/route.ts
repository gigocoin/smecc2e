import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
} from "@/lib/auth-service";
import { updateProjectMilestoneStatus } from "@/lib/project-milestones-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCoordinatorSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };

    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const milestone = await updateProjectMilestoneStatus(id, body.status);
    return NextResponse.json({ milestone });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/project-milestones/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update milestone";
    const status = message === "Milestone not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
