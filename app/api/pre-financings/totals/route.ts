import { NextResponse } from "next/server";
import {
  AuthError,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  resolveApiError,
  toUserFacingDatabaseError,
} from "@/lib/prisma-errors";
import { getReleasedTotalsByTranche } from "@/lib/pre-financing-service";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const totals = await getReleasedTotalsByTranche();
    return NextResponse.json({ totals });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/pre-financings/totals", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: resolveApiError(err, "Failed to load pre-financing totals"),
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
