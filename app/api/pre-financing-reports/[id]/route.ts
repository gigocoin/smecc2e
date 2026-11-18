import { NextResponse } from "next/server";
import {
  AuthError,
  requireFinanceOfficerSessionUser,
  requireSessionUser,
} from "@/lib/auth-service";
import {
  resolveApiError,
  toUserFacingDatabaseError,
} from "@/lib/prisma-errors";
import {
  deletePreFinancingReport,
  updatePreFinancingReport,
  type UpdatePreFinancingReportInput,
} from "@/lib/pre-financing-report-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function actorFlags(role: string) {
  return {
    actorIsCoordinator:
      role === "Finance Coordinator" || role === "Super Admin",
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireFinanceOfficerSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as UpdatePreFinancingReportInput;
    const report = await updatePreFinancingReport(id, body, {
      actorPublicId: sessionUser.id,
      ...actorFlags(sessionUser.role),
    });
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/pre-financing-reports/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update pre-financing report";
    const status = message.includes("not found")
      ? 404
      : message.includes("only edit")
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    if (
      sessionUser.role !== "Finance Officer" &&
      sessionUser.role !== "Finance Coordinator" &&
      sessionUser.role !== "Super Admin"
    ) {
      throw new AuthError("Forbidden", 403);
    }
    const { id } = await context.params;
    await deletePreFinancingReport(id, {
      actorPublicId: sessionUser.id,
      ...actorFlags(sessionUser.role),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("DELETE /api/pre-financing-reports/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to delete pre-financing report";
    const status = message.includes("not found")
      ? 404
      : message.includes("only delete")
        ? 403
        : 400;
    return NextResponse.json(
      { error: resolveApiError(err, message) },
      { status }
    );
  }
}
