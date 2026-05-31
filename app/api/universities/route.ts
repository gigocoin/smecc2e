import { NextResponse } from "next/server";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import {
  createUniversity,
  listUniversitiesForApplicants,
} from "@/lib/universities-service";

export async function GET() {
  try {
    const universities = await listUniversitiesForApplicants();
    return NextResponse.json({
      universities,
      universityNames: universities.map((u) => u.name),
    });
  } catch (err) {
    console.error("GET /api/universities", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load universities from database",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      thematicAreas?: string[];
    };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "University name is required" },
        { status: 400 }
      );
    }
    const thematicAreas = Array.isArray(body.thematicAreas)
      ? body.thematicAreas
      : [];
    const { universities } = await createUniversity(name, thematicAreas);
    return NextResponse.json(
      {
        universities,
        universityNames: universities.map((u) => u.name),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/universities", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create university";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
