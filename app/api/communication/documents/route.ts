import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  createCommunicationDocument,
  listCommunicationDocuments,
} from "@/lib/communication-documents-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.ms-excel":
      return "xlsx";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function fileExtension(name: string): string {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function isAllowedUpload(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true;
  const ext = fileExtension(file.name);
  return ALLOWED_EXTENSIONS.has(ext);
}

function sanitizeOriginalName(name: string): string {
  return name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120);
}

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const documents = await listCommunicationDocuments();
    return NextResponse.json({ documents });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/communication/documents", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load communication documents",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCoordinatorOrAdministratorSessionUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const descriptionRaw = formData.get("description");
    const categoryIdRaw = formData.get("categoryId");
    const subCategoryRaw = formData.get("subCategory");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedUpload(file)) {
      return NextResponse.json(
        { error: "Use PDF, Word, Excel, JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be 10 MB or smaller" },
        { status: 400 }
      );
    }

    const categoryId =
      typeof categoryIdRaw === "string" ? categoryIdRaw.trim() : "";
    if (!categoryId) {
      return NextResponse.json(
        { error: "Select a document category" },
        { status: 400 }
      );
    }

    const description =
      typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";
    const subCategory =
      typeof subCategoryRaw === "string" ? subCategoryRaw.trim() : "";

    const resolvedExt = extensionForMime(file.type);
    const ext =
      resolvedExt !== "bin" ? resolvedExt : fileExtension(file.name) || "bin";
    const storedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "communication"
    );
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, storedName), buffer);

    const fileUrl = `/uploads/communication/${storedName}`;
    const document = await createCommunicationDocument({
      description,
      categoryId,
      subCategory,
      fileName: sanitizeOriginalName(file.name),
      fileUrl,
      mimeType: file.type,
      fileSize: file.size,
      uploadedByName: user.name,
      uploadedByEmail: user.email,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/communication/documents", err);
    const connectionError = toUserFacingDatabaseError(err);
    const message =
      connectionError ??
      (err instanceof Error
        ? err.message
        : "Failed to upload communication document");
    const isClientError =
      !connectionError &&
      err instanceof Error &&
      (/category/i.test(err.message) || /sub-category/i.test(err.message));
    return NextResponse.json(
      {
        error: message,
      },
      { status: connectionError ? 503 : isClientError ? 400 : 500 }
    );
  }
}
