import { NextResponse } from "next/server";
import type { DashboardUser } from "@/lib/dashboard-users";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { createUser, listUsers } from "@/lib/users-service";

export async function GET() {
  try {
    await requireDashboardSessionUser();
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/users", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load users from database",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireDashboardSessionUser();
    if (sessionUser.role === "Evaluator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
      institution?: string;
      profileImageUrl?: string | null;
      role?: DashboardUser["role"];
      status?: DashboardUser["status"];
    };

    const role =
      body.role ??
      (sessionUser.role === "Administrator" ? "Evaluator" : "Coordinator");
    const status = body.status ?? "Active";

    if (sessionUser.role === "Administrator" && role !== "Evaluator") {
      return NextResponse.json(
        { error: "Administrators can only create evaluator accounts." },
        { status: 403 }
      );
    }

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

    const { users } = await createUser({
      name: body.name ?? "",
      email: body.email ?? "",
      phoneNumber: body.phoneNumber ?? "",
      password: body.password ?? "",
      institution: body.institution ?? "",
      profileImageUrl: body.profileImageUrl ?? null,
      role,
      status,
    });

    return NextResponse.json({ users }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("POST /api/users", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create user";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
