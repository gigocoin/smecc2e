import { NextResponse } from "next/server";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { listScholars } from "@/lib/scholars-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireDashboardSessionUser();
    const scholars = await listScholars({
      assignedToEvaluatorPublicId:
        user.role === "Evaluator" ? user.id : undefined,
      hostInstitution:
        user.role === "Administrator" ? user.institution : undefined,
    });
    return NextResponse.json({ scholars });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/scholars", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load scholars" },
      { status: connectionError ? 503 : 500 }
    );
  }
}
