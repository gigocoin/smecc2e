import { NextResponse } from "next/server";
import {
  AuthError,
  requireDashboardSessionUser,
  requireFinanceOfficerSessionUser,
} from "@/lib/auth-service";
import {
  resolveApiError,
  toUserFacingDatabaseError,
} from "@/lib/prisma-errors";
import {
  createPreFinancingReport,
  listPreFinancingReports,
  parseFinanceRecordsViewParam,
  type CreatePreFinancingReportInput,
} from "@/lib/pre-financing-report-service";

export async function GET(request: Request) {
  try {
    const sessionUser = await requireDashboardSessionUser();
    const { searchParams } = new URL(request.url);
    const tranche = parseFinanceRecordsViewParam(searchParams.get("tranche"));
    const financeOfficerIdParam = searchParams.get("financeOfficerId");

    const financeOfficerPublicId =
      sessionUser.role === "Finance Officer"
        ? sessionUser.id
        : financeOfficerIdParam;

    const reports = await listPreFinancingReports({
      tranche,
      financeOfficerPublicId,
    });
    return NextResponse.json({ reports });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/pre-financing-reports", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: resolveApiError(err, "Failed to load pre-financing reports"),
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireFinanceOfficerSessionUser();
    const body = (await request.json()) as Omit<
      CreatePreFinancingReportInput,
      "financeOfficerPublicId"
    >;
    const report = await createPreFinancingReport({
      ...body,
      financeOfficerPublicId: sessionUser.id,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/pre-financing-reports", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create pre-financing report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
