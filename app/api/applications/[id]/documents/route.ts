import { NextResponse } from "next/server";
import {
  getStoredDocumentName,
  isApplicationDocumentField,
} from "@/lib/application-documents";
import { readApplicationDocument } from "@/lib/application-document-storage";
import { mimeTypeForFileName } from "@/lib/application-documents-server";
import { getApplication } from "@/lib/applications-service";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireDashboardSessionUser();
    const { id } = await context.params;
    const field = new URL(request.url).searchParams.get("field")?.trim() ?? "";

    if (!isApplicationDocumentField(field)) {
      return NextResponse.json({ error: "Invalid document field" }, { status: 400 });
    }

    const application = await getApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const storedName = getStoredDocumentName(application, field);
    if (!storedName) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const document = await readApplicationDocument(
      application.id,
      storedName,
      field
    );
    if (!document) {
      return NextResponse.json(
        {
          error:
            "Document file missing on the server. Ask the applicant to re-upload the file by opening their draft application, or submit a new application with documents attached.",
        },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(document.buffer), {
      headers: {
        "Content-Type": mimeTypeForFileName(document.fileName),
        "Content-Disposition": `inline; filename="${document.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
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
