import { NextResponse } from "next/server";
import { requireApplicantOwnsApplication } from "@/lib/applicant-application-auth";
import { ApplicantAuthError } from "@/lib/applicant-auth-service";
import {
  applicationDocumentStorageErrorResponse,
  blobStorageConfigurationError,
  isProductionWithoutBlobStorage,
  saveApplicationDocument,
} from "@/lib/application-document-storage";
import {
  buildStoredDocumentName,
  documentDisplayName,
  isApplicationDocumentField,
  isJpgOrPngMimeType,
  isPdfMimeType,
} from "@/lib/application-documents";
import { mimeTypeForFileName } from "@/lib/application-documents-server";
import { getApplication } from "@/lib/applications-service";

const MAX_BYTES = 5 * 1024 * 1024;
const JPG_PNG_ONLY_FIELDS = new Set(["profile", "passport"]);
const PDF_ONLY_FIELDS = new Set([
  "academicCertificates",
  "academicTranscripts",
  "cv",
  "publications",
  "researchProposal",
  "languageCertificate",
  "referenceLetters",
  "graduateAdmissionProof",
  "medicalFitnessDeclaration",
]);

function pdfOnlyErrorMessage(field: string): string {
  switch (field) {
    case "academicCertificates":
      return "Academic certificates upload must be a PDF file.";
    case "academicTranscripts":
      return "Academic transcripts upload must be a PDF file.";
    case "cv":
      return "Curriculum vitae upload must be a PDF file.";
    case "publications":
      return "Publications upload must be a PDF file.";
    case "researchProposal":
      return "Research proposal upload must be a PDF file.";
    case "languageCertificate":
      return "Language certificate upload must be a PDF file.";
    case "referenceLetters":
      return "Reference letters upload must be a PDF file.";
    case "graduateAdmissionProof":
      return "Graduate admission proof upload must be a PDF file.";
    case "medicalFitnessDeclaration":
      return "Medical fitness declaration upload must be a PDF file.";
    default:
      return "This file must be a PDF.";
  }
}
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

    const resolvedMime = file.type || mimeTypeForFileName(file.name);
    if (JPG_PNG_ONLY_FIELDS.has(fieldRaw)) {
      if (!isJpgOrPngMimeType(resolvedMime)) {
        const errorMessage =
          fieldRaw === "profile"
            ? "Profile picture must be a JPG or PNG image."
            : "Passport or national ID upload must be a JPG or PNG image.";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
    } else if (PDF_ONLY_FIELDS.has(fieldRaw)) {
      if (!isPdfMimeType(resolvedMime)) {
        return NextResponse.json(
          { error: pdfOnlyErrorMessage(fieldRaw) },
          { status: 400 }
        );
      }
    } else if (!ALLOWED_TYPES.has(resolvedMime)) {
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
    const storageError = applicationDocumentStorageErrorResponse(err);
    if (storageError) {
      return NextResponse.json(
        { error: storageError.error },
        { status: storageError.status }
      );
    }
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
