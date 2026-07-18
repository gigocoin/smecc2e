import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  createProjectRisk,
  listProjectRisks,
  saveProjectRisks,
  type ProjectRiskInput,
} from "@/lib/project-risks-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const risks = await listProjectRisks();
    return NextResponse.json({ risks });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/project-risks", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load risks" },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as ProjectRiskInput;
    const risk = await createProjectRisk(body);
    return NextResponse.json({ risk }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/project-risks", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create risk";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireCoordinatorSessionUser();
    const body = (await request.json()) as { risks?: ProjectRiskInput[] };
    if (!body || !Array.isArray(body.risks)) {
      return NextResponse.json(
        { error: 'Body must include a "risks" array.' },
        { status: 400 }
      );
    }
    const risks = await saveProjectRisks(body.risks);
    return NextResponse.json({ risks, saved: risks.length });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PUT /api/project-risks", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to save risks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
