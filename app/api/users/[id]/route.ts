import { NextResponse } from "next/server";
import type { DashboardUser } from "@/lib/dashboard-users";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { deleteUser, updateUser } from "@/lib/users-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireDashboardSessionUser();
    if (sessionUser.role === "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      address?: string;
      phoneNumber?: string;
      password?: string;
      institution?: string;
      isFocalPerson?: boolean;
      profileImageUrl?: string | null;
      role?: DashboardUser["role"];
      status?: DashboardUser["status"];
    };

    const role = body.role ?? "Coordinator";
    const status = body.status ?? "Active";

    if (
      role !== "Coordinator" &&
      role !== "Evaluator" &&
      role !== "Administrator"
    ) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (status !== "Active" && status !== "Inactive") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { users } = await updateUser(id, {
      name: body.name ?? "",
      email: body.email ?? "",
      address: body.address ?? "",
      phoneNumber: body.phoneNumber ?? "",
      institution: body.institution ?? "",
      isFocalPerson: Boolean(body.isFocalPerson),
      profileImageUrl: body.profileImageUrl ?? null,
      role,
      status,
      password: body.password,
    });

    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/users/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update user";
    const status =
      message === "User not found"
        ? 404
        : message.includes("already exists") ||
            message.includes("already the focal person") ||
            message.includes("Only one focal person")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireDashboardSessionUser();
    if (sessionUser.role === "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await context.params;
    const { users } = await deleteUser(id);
    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("DELETE /api/users/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to delete user";
    const status = message === "User not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
