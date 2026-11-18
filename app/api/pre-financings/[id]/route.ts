import { NextResponse } from "next/server";
import {
  AuthError,
  requireFinanceCoordinatorSessionUser,
} from "@/lib/auth-service";
import {
  resolveApiError,
  toUserFacingDatabaseError,
} from "@/lib/prisma-errors";
import {
  deletePreFinancing,
  updatePreFinancing,
  type UpdatePreFinancingInput,
} from "@/lib/pre-financing-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireFinanceCoordinatorSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as UpdatePreFinancingInput;
    const record = await updatePreFinancing(id, body);
    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/pre-financings/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update pre-financing";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireFinanceCoordinatorSessionUser();
    const { id } = await context.params;
    await deletePreFinancing(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("DELETE /api/pre-financings/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to delete pre-financing";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json(
      { error: resolveApiError(err, message) },
      { status }
    );
  }
}
