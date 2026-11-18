import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-service";
import { resolveApiError, toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error("GET /api/auth/me", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: resolveApiError(err, "Failed to load session"),
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}
