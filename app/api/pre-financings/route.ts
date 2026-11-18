import { NextResponse } from "next/server";
import {
  AuthError,
  requireDashboardSessionUser,
  requireFinanceCoordinatorSessionUser,
} from "@/lib/auth-service";
import {
  resolveApiError,
  toUserFacingDatabaseError,
} from "@/lib/prisma-errors";
import {
  createPreFinancing,
  listPreFinancings,
  parseFinanceRecordsViewParam,
  type CreatePreFinancingInput,
} from "@/lib/pre-financing-service";

export async function GET(request: Request) {
  try {
    const sessionUser = await requireDashboardSessionUser();
    const { searchParams } = new URL(request.url);
    const tranche = parseFinanceRecordsViewParam(searchParams.get("tranche"));
    const financeOfficerIdParam = searchParams.get("financeOfficerId");

    const financeOfficerId =
      sessionUser.role === "Finance Officer"
        ? sessionUser.id
        : financeOfficerIdParam;

    const records = await listPreFinancings({
      tranche,
      financeOfficerId,
    });
    return NextResponse.json({ records });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/pre-financings", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error: resolveApiError(err, "Failed to load pre-financing records"),
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireFinanceCoordinatorSessionUser();
    const body = (await request.json()) as CreatePreFinancingInput;
    const record = await createPreFinancing({
      ...body,
      createdById: sessionUser.id,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/pre-financings", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create pre-financing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
