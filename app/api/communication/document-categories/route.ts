import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import {
  createCommunicationDocumentCategory,
  listCommunicationDocumentCategories,
} from "@/lib/communication-document-categories-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const categories = await listCommunicationDocumentCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/communication/document-categories", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load document categories",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireCoordinatorOrAdministratorSessionUser();
    const body = (await request.json()) as {
      name?: string;
      subCategories?: string[];
    };
    const category = await createCommunicationDocumentCategory({
      name: body.name ?? "",
      subCategories: body.subCategories,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/communication/document-categories", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create document category";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
