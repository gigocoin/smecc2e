import { NextResponse } from "next/server";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { setProgramActive } from "@/lib/programs-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireDashboardSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as { isActive?: boolean };

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be true or false." },
        { status: 400 }
      );
    }

    const { universities } = await setProgramActive(id, body.isActive);
    return NextResponse.json({ universities });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/programs/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update program";
    const status = message === "Program not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
