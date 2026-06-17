import { regionIdFromName } from "./regions";
import { prisma } from "./prisma";

export type CommunicationDocumentCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  subCategories: string[];
  createdAt: string;
};

function normalizeSubCategories(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function mapCommunicationDocumentCategory(row: {
  id: string;
  name: string;
  slug: string;
  subCategories: string[];
  createdAt: Date;
}): CommunicationDocumentCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subCategories: row.subCategories,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCommunicationDocumentCategories(): Promise<
  CommunicationDocumentCategoryRecord[]
> {
  const rows = await prisma.communicationDocumentCategory.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map(mapCommunicationDocumentCategory);
}

export async function createCommunicationDocumentCategory(input: {
  name: string;
  subCategories?: string[];
}): Promise<CommunicationDocumentCategoryRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }

  const slug = regionIdFromName(name);
  const subCategories = normalizeSubCategories(input.subCategories ?? []);

  try {
    const row = await prisma.communicationDocumentCategory.create({
      data: { name, slug, subCategories },
    });
    return mapCommunicationDocumentCategory(row);
  } catch (err) {
    const isPrismaUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      throw new Error("A category with this name already exists");
    }
    throw err;
  }
}

export async function updateCommunicationDocumentCategory(
  id: string,
  input: {
    name: string;
    subCategories?: string[];
  }
): Promise<CommunicationDocumentCategoryRecord> {
  const existing = await prisma.communicationDocumentCategory.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error("Category not found");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }

  const slug = regionIdFromName(name);
  const subCategories = normalizeSubCategories(input.subCategories ?? []);

  try {
    const row = await prisma.communicationDocumentCategory.update({
      where: { id },
      data: { name, slug, subCategories },
    });
    return mapCommunicationDocumentCategory(row);
  } catch (err) {
    const isPrismaUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      throw new Error("A category with this name already exists");
    }
    throw err;
  }
}
