import { NextResponse } from "next/server";
import { authenticateUser, safeRedirectPath } from "@/lib/auth-service";
import { portalForRole } from "@/lib/dashboard-portal";
import {
  AUTH_SESSION_COOKIE,
  authSessionCookieOptions,
} from "@/lib/auth-session";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      redirect?: string;
    };

    const result = await authenticateUser(
      body.email ?? "",
      body.password ?? ""
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    if (!portalForRole(result.user.role)) {
      return NextResponse.json(
        {
          error:
            "Only coordinators, administrators, and evaluators can access the dashboard.",
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: result.user,
      redirectTo: safeRedirectPath(body.redirect, result.user.role),
    });

    const opts = await authSessionCookieOptions(
      result.user.id,
      result.user.role
    );
    response.cookies.set(AUTH_SESSION_COOKIE, opts.value, {
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
      maxAge: opts.maxAge,
    });

    return response;
  } catch (err) {
    console.error("POST /api/auth/login", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Login failed. Please try again." },
      { status: connectionError ? 503 : 500 }
    );
  }
}
