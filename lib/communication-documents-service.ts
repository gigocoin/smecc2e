import { prisma } from "./prisma";

export type CommunicationDocumentRecord = {
  id: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  subCategory: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  uploadedByEmail: string;
  createdAt: string;
};

const documentInclude = {
  category: { select: { id: true, name: true, subCategories: true } },
} as const;

function mapCommunicationDocument(row: {
  id: string;
  description: string;
  categoryId: string | null;
  subCategory: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  uploadedByEmail: string;
  createdAt: Date;
  category: { id: string; name: string; subCategories: string[] } | null;
}): CommunicationDocumentRecord {
  return {
    id: row.id,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    subCategory: row.subCategory,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    uploadedByName: row.uploadedByName,
    uploadedByEmail: row.uploadedByEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCommunicationDocuments(): Promise<
  CommunicationDocumentRecord[]
> {
  const rows = await prisma.communicationDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: documentInclude,
  });
  return rows.map(mapCommunicationDocument);
}

export async function createCommunicationDocument(input: {
  description: string;
  categoryId: string;
  subCategory?: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  uploadedByEmail: string;
}): Promise<CommunicationDocumentRecord> {
  const category = await prisma.communicationDocumentCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw new Error("Selected document category was not found");
  }

  const subCategory = input.subCategory?.trim() ?? "";
  if (category.subCategories.length > 0) {
    if (!subCategory) {
      throw new Error("Select a sub-category for this document");
    }
    const validSubCategory = category.subCategories.some(
      (item) => item.toLowerCase() === subCategory.toLowerCase()
    );
    if (!validSubCategory) {
      throw new Error("Selected sub-category is not valid for this category");
    }
  }

  const row = await prisma.communicationDocument.create({
    data: {
      description: input.description.trim(),
      categoryId: category.id,
      subCategory,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      uploadedByName: input.uploadedByName,
      uploadedByEmail: input.uploadedByEmail,
    },
    include: documentInclude,
  });
  return mapCommunicationDocument(row);
}
