import { NextResponse } from "next/server";
import {
  ApplicantAuthError,
  applicantLoginRedirect,
  loginApplicant,
} from "@/lib/applicant-auth-service";
import {
  APPLICANT_SESSION_COOKIE,
  applicantSessionCookieOptions,
} from "@/lib/applicant-session";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const result = await loginApplicant(body.email ?? "", body.password ?? "");
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      email: result.email,
      mustChangePassword: result.mustChangePassword,
      redirectTo: applicantLoginRedirect(
        result.mustChangePassword,
        result.currentPage,
        result.status
      ),
    });

    const opts = await applicantSessionCookieOptions(
      result.email,
      result.applicantId,
      result.mustChangePassword
    );
    response.cookies.set(APPLICANT_SESSION_COOKIE, opts.value, {
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
      maxAge: opts.maxAge,
    });

    return response;
  } catch (err) {
    console.error("POST /api/auth/applicant/login", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Login failed. Please try again." },
      { status: connectionError ? 503 : 500 }
    );
  }
}
