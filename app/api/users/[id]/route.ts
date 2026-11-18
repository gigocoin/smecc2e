import { NextResponse } from "next/server";
import {
  canAssignRole,
  isDashboardUserRole,
  isSuperAdminRole,
  usersVisibleTo,
  type DashboardUser,
} from "@/lib/dashboard-users";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import {
  resolveApiError,
  toUserFacingDatabaseError,
} from "@/lib/prisma-errors";
import {
  deleteUser,
  getUserByPublicId,
  updateUser,
} from "@/lib/users-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireDashboardSessionUser();
    if (sessionUser.role === "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await context.params;
    const existing = await getUserByPublicId(id);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (
      isSuperAdminRole(existing.role) &&
      !isSuperAdminRole(sessionUser.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    if (!isDashboardUserRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!canAssignRole(sessionUser.role, role)) {
      return NextResponse.json(
        { error: "Only Super Admin users can assign the Super Admin role." },
        { status: 403 }
      );
    }
    if (status !== "Active" && status !== "Inactive") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await updateUser(id, {
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

    return NextResponse.json({
      users: usersVisibleTo(updated.users, sessionUser.role),
    });
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
    const message = resolveApiError(err, "Failed to update user");
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
    const existing = await getUserByPublicId(id);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (
      isSuperAdminRole(existing.role) &&
      !isSuperAdminRole(sessionUser.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteUser(id);
    return NextResponse.json({
      users: usersVisibleTo(deleted.users, sessionUser.role),
    });
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
    const message = resolveApiError(err, "Failed to delete user");
    const status = message === "User not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
