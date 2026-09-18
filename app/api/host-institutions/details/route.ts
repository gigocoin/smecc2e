import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
} from "@/lib/auth-service";
import { getHostInstitutionDetails } from "@/lib/nominee-letter-email";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireCoordinatorOrAdministratorSessionUser();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim() ?? "";
    if (!name) {
      return NextResponse.json(
        { error: "Host university name is required" },
        { status: 400 }
      );
    }

    const details = await getHostInstitutionDetails(name);
    return NextResponse.json({ details });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/host-institutions/details", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to load host institution details" },
      { status: connectionError ? 503 : 500 }
    );
  }
}
