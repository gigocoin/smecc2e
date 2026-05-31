import type { Prisma } from "@prisma/client";
import type { CreateProgramInput, ProgramRecord } from "./academic-program";
import { programTypeToPrisma } from "./academic-program";
import { prisma } from "./prisma";
import { mapPrismaProgram, mapPrismaUniversity } from "./prisma-mappers";
import type { UniversityRecord } from "./universities";

export type UniversityWithPrograms = UniversityRecord & {
  programs: ProgramRecord[];
};

const universityWithProgramsInclude = {
  programs: { orderBy: { name: "asc" as const } },
} satisfies Prisma.UniversityInclude;

export async function listUniversitiesWithPrograms(): Promise<
  UniversityWithPrograms[]
> {
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: universityWithProgramsInclude,
  });
  return universities.map((university) => ({
    ...mapPrismaUniversity(university),
    programs: university.programs.map((program) =>
      mapPrismaProgram(program, university.name)
    ),
  }));
}

export async function createProgram(
  input: CreateProgramInput
): Promise<{ universities: UniversityWithPrograms[] }> {
  const country = input.country.trim();
  const name = input.name.trim();
  const thematicArea = input.thematicArea.trim();
  const accreditationDetails = input.accreditationDetails.trim();

  if (!input.universityId) throw new Error("Institution is required");
  if (!country) throw new Error("Country is required");
  if (!name) throw new Error("Program name is required");
  if (!thematicArea) throw new Error("Thematic area is required");
  if (!accreditationDetails) {
    throw new Error("Details of accreditation is required");
  }

  const university = await prisma.university.findUnique({
    where: { id: input.universityId },
  });
  if (!university) {
    throw new Error("Institution not found");
  }

  try {
    await prisma.program.create({
      data: {
        universityId: university.id,
        country,
        type: programTypeToPrisma(input.type),
        name,
        thematicArea,
        accreditationDetails,
      },
    });
  } catch (err) {
    const isPrismaUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      throw new Error(
        "A programme with this name and type already exists for this institution"
      );
    }
    throw err;
  }

  const universities = await listUniversitiesWithPrograms();
  return { universities };
}

export async function setProgramActive(
  programId: string,
  isActive: boolean
): Promise<{ universities: UniversityWithPrograms[] }> {
  const existing = await prisma.program.findUnique({
    where: { id: programId },
  });
  if (!existing) {
    throw new Error("Program not found");
  }

  await prisma.program.update({
    where: { id: programId },
    data: { isActive },
  });

  const universities = await listUniversitiesWithPrograms();
  return { universities };
}

export async function importPrograms(
  inputs: Array<{ row: number } & CreateProgramInput>
): Promise<{
  created: number;
  errors: Array<{ row: number; message: string }>;
}> {
  let created = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (const input of inputs) {
    const country = input.country.trim();
    const name = input.name.trim();
    const thematicArea = input.thematicArea.trim();
    const accreditationDetails = input.accreditationDetails.trim();

    try {
      // Create the program (unique constraint is enforced by the DB).
      await prisma.program.create({
        data: {
          universityId: input.universityId,
          country,
          type: programTypeToPrisma(input.type),
          name,
          thematicArea,
          accreditationDetails,
        },
      });
      created++;
    } catch (err) {
      const isPrismaUnique =
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      errors.push({
        row: input.row,
        message: isPrismaUnique
          ? "A programme with this name and type already exists for this institution"
          : err instanceof Error
            ? err.message
            : "Failed to create program",
      });
    }
  }

  return { created, errors };
}
