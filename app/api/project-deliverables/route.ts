import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  listProjectDeliverables,
  saveProjectDeliverables,
  type ProjectDeliverableInput,
} from "@/lib/project-deliverables-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const deliverables = await listProjectDeliverables();
    return NextResponse.json({ deliverables });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/project-deliverables", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load deliverables" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as {
      deliverables?: ProjectDeliverableInput[];
    };
    if (!body || !Array.isArray(body.deliverables)) {
      return NextResponse.json(
        { error: 'Body must include a "deliverables" array.' },
        { status: 400 }
      );
    }
    const deliverables = await saveProjectDeliverables(body.deliverables);
    return NextResponse.json({ deliverables, saved: deliverables.length });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PUT /api/project-deliverables", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to save deliverables";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
