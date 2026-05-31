import { NextResponse } from "next/server";
import type { ProgramTypeLabel } from "@/lib/academic-program";
import { PROGRAM_TYPES } from "@/lib/academic-program";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { setProgramActive, updateProgram } from "@/lib/programs-service";

type RouteContext = { params: Promise<{ id: string }> };

function programUpdateErrorStatus(message: string): number {
  if (message === "Program not found" || message === "Institution not found") {
    return 404;
  }
  if (message.includes("already exists")) {
    return 409;
  }
  return 400;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireDashboardSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      isActive?: boolean;
      institutionId?: string;
      country?: string;
      type?: string;
      name?: string;
      thematicArea?: string;
      accreditationDetails?: string;
    };

    const hasFullUpdate =
      body.institutionId !== undefined ||
      body.country !== undefined ||
      body.type !== undefined ||
      body.name !== undefined ||
      body.thematicArea !== undefined ||
      body.accreditationDetails !== undefined;

    if (hasFullUpdate) {
      const type = body.type as ProgramTypeLabel | undefined;
      if (!type || !PROGRAM_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid program type" }, { status: 400 });
      }

      const { universities } = await updateProgram(id, {
        universityId: body.institutionId ?? "",
        country: body.country ?? "",
        type,
        name: body.name ?? "",
        thematicArea: body.thematicArea ?? "",
        accreditationDetails: body.accreditationDetails ?? "",
      });
      return NextResponse.json({ universities });
    }

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "No valid program fields to update." },
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
    return NextResponse.json(
      { error: message },
      { status: programUpdateErrorStatus(message) }
    );
  }
}
