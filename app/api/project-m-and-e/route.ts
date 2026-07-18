import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  listProjectMandE,
  saveProjectMandE,
  type ProjectMandEInput,
} from "@/lib/project-m-and-e-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const indicators = await listProjectMandE();
    return NextResponse.json({ indicators });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/project-m-and-e", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load M&E indicators" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as {
      indicators?: ProjectMandEInput[];
    };
    if (!body || !Array.isArray(body.indicators)) {
      return NextResponse.json(
        { error: 'Body must include an "indicators" array.' },
        { status: 400 }
      );
    }
    const indicators = await saveProjectMandE(body.indicators);
    return NextResponse.json({ indicators, saved: indicators.length });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PUT /api/project-m-and-e", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to save M&E indicators";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
