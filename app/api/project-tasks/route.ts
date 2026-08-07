import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  createProjectTask,
  listProjectTasks,
  type CreateProjectTaskInput,
} from "@/lib/project-tasks-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET(request: Request) {
  try {
    await requireDashboardSessionUser();
    const workPackage = new URL(request.url).searchParams.get("workPackage");
    const tasks = await listProjectTasks(workPackage);
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/project-tasks", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load tasks" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as CreateProjectTaskInput;
    const task = await createProjectTask(body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/project-tasks", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
