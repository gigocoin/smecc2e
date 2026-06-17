import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorOrAdministratorSessionUser,
} from "@/lib/auth-service";
import { updateCommunicationDocumentCategory } from "@/lib/communication-document-categories-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCoordinatorOrAdministratorSessionUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      subCategories?: string[];
    };

    const category = await updateCommunicationDocumentCategory(id, {
      name: body.name ?? "",
      subCategories: body.subCategories,
    });
    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/communication/document-categories/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update document category";
    const status =
      message === "Category not found"
        ? 404
        : message.includes("already exists")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
