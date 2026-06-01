import { NextResponse } from "next/server";
import { requireApplicantOwnsApplication } from "@/lib/applicant-application-auth";
import { ApplicantAuthError } from "@/lib/applicant-auth-service";
import {
  getStoredDocumentName,
  isApplicationDocumentField,
} from "@/lib/application-documents";
import {
  primaryApplicationDocumentRef,
  readApplicationDocumentWithRefs,
  useBlobStorage,
} from "@/lib/application-document-storage";
import { mimeTypeForFileName } from "@/lib/application-documents-server";
import {
  getApplication,
  getApplicationDocumentStorageRefs,
} from "@/lib/applications-service";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";

async function authorizeDocumentAccess(application: NonNullable<
  Awaited<ReturnType<typeof getApplication>>
>): Promise<void> {
  if (application.status === "draft") {
    await requireApplicantOwnsApplication(application.id);
    return;
  }
  await requireDashboardSessionUser();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const field = new URL(request.url).searchParams.get("field")?.trim() ?? "";

    if (!isApplicationDocumentField(field)) {
      return NextResponse.json({ error: "Invalid document field" }, { status: 400 });
    }

    const application = await getApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    await authorizeDocumentAccess(application);

    const storedName = getStoredDocumentName(application, field);
    if (!storedName) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const storageRefs = await getApplicationDocumentStorageRefs(id);
    if (!storageRefs) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const migrateToRef = primaryApplicationDocumentRef(
      application.id,
      storageRefs[storageRefs.length - 1] ?? application.id
    );

    const document = await readApplicationDocumentWithRefs(
      storageRefs,
      storedName,
      field,
      { migrateToRef }
    );
    if (!document) {
      const missingMessage = useBlobStorage()
        ? "Document file missing on the server. Ask the applicant to re-upload the file by opening their draft application, or submit a new application with documents attached."
        : "Document storage is not configured for production. Connect a Vercel Blob store and set BLOB_READ_WRITE_TOKEN, then ask the applicant to re-upload their documents.";
      return NextResponse.json(
        { error: missingMessage },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(document.buffer), {
      headers: {
        "Content-Type": mimeTypeForFileName(document.fileName),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/applications/[id]/documents", err);
    return NextResponse.json(
      { error: "Failed to open document" },
      { status: 500 }
    );
  }
}
