import { prisma } from "./prisma";
import { mapPrismaProgram, mapPrismaUniversity } from "./prisma-mappers";
import {
  universitySlugFromName,
  type UniversityRecord,
} from "./universities";

export async function listUniversities(options?: {
  activeProgramsOnly?: boolean;
}): Promise<UniversityRecord[]> {
  const activeProgramsOnly = options?.activeProgramsOnly ?? false;
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: {
      programs: {
        where: activeProgramsOnly ? { isActive: true } : undefined,
        orderBy: { name: "asc" },
      },
    },
  });
  return universities.map((university) => ({
    ...mapPrismaUniversity(university),
    programs: university.programs.map((program) =>
      mapPrismaProgram(program, university.name)
    ),
  }));
}

export async function listUniversitiesForApplicants(): Promise<UniversityRecord[]> {
  return listUniversities({ activeProgramsOnly: true });
}

export async function createUniversity(
  name: string,
  thematicAreas: string[] = []
): Promise<{ universities: UniversityRecord[] }> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("University name is required");
  }

  const slug = universitySlugFromName(trimmed);
  const uniqueThematicAreas = [
    ...new Set(thematicAreas.map((a) => a.trim()).filter(Boolean)),
  ];

  try {
    await prisma.university.create({
      data: {
        slug,
        name: trimmed,
        thematicAreas: uniqueThematicAreas,
      },
    });
  } catch (err) {
    const isPrismaUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      throw new Error("A university with this name already exists");
    }
    throw err;
  }

  const universities = await listUniversities();
  return { universities };
}

export async function updateUniversity(
  slug: string,
  name: string,
  thematicAreas: string[] = []
): Promise<{ universities: UniversityRecord[] }> {
  const existing = await prisma.university.findUnique({ where: { slug } });
  if (!existing) {
    throw new Error("University not found");
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("University name is required");
  }

  const newSlug = universitySlugFromName(trimmed);
  const uniqueThematicAreas = [
    ...new Set(thematicAreas.map((a) => a.trim()).filter(Boolean)),
  ];

  try {
    await prisma.university.update({
      where: { slug },
      data: {
        slug: newSlug,
        name: trimmed,
        thematicAreas: uniqueThematicAreas,
      },
    });
  } catch (err) {
    const isPrismaUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      throw new Error("A university with this name already exists");
    }
    throw err;
  }

  const universities = await listUniversities();
  return { universities };
}

export async function deleteUniversity(
  slug: string
): Promise<{ universities: UniversityRecord[] }> {
  const existing = await prisma.university.findUnique({ where: { slug } });
  if (!existing) {
    throw new Error("University not found");
  }

  await prisma.university.delete({ where: { slug } });
  const universities = await listUniversities();
  return { universities };
}
