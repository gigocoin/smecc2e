import { NextResponse } from "next/server";
import { requireApplicantOwnsApplication } from "@/lib/applicant-application-auth";
import { ApplicantAuthError } from "@/lib/applicant-auth-service";
import {
  blobStorageConfigurationError,
  isProductionWithoutBlobStorage,
  saveApplicationDocument,
} from "@/lib/application-document-storage";
import {
  buildStoredDocumentName,
  documentDisplayName,
  isApplicationDocumentField,
} from "@/lib/application-documents";
import { mimeTypeForFileName } from "@/lib/application-documents-server";
import { getApplication } from "@/lib/applications-service";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (isProductionWithoutBlobStorage()) {
      return NextResponse.json(
        { error: blobStorageConfigurationError() },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    await requireApplicantOwnsApplication(id);
    const application = await getApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (application.status !== "draft") {
      return NextResponse.json(
        { error: "Documents can only be uploaded while the application is a draft" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fieldRaw = formData.get("field");
    const file = formData.get("file");

    if (typeof fieldRaw !== "string" || !isApplicationDocumentField(fieldRaw)) {
      return NextResponse.json({ error: "Invalid document field" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Use PDF, Word, or image files" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be 5 MB or smaller" },
        { status: 400 }
      );
    }

    const storedName =
      fieldRaw === "profile"
        ? `profile__${buildStoredDocumentName(file.name)}`
        : buildStoredDocumentName(file.name);

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveApplicationDocument(
      application.id,
      storedName,
      buffer,
      file.type || mimeTypeForFileName(file.name)
    );

    return NextResponse.json(
      {
        storedName,
        displayName: documentDisplayName(storedName),
        field: fieldRaw,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/applications/[id]/upload", err);
    const message =
      err instanceof Error ? err.message : "Failed to upload document";
    if (message.includes("BLOB_READ_WRITE_TOKEN")) {
      return NextResponse.json({ error: blobStorageConfigurationError() }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
