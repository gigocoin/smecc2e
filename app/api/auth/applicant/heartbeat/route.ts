import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  APPLICANT_SESSION_COOKIE,
  refreshedApplicantSessionCookieOptions,
  verifyApplicantSessionToken,
} from "@/lib/applicant-session";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(APPLICANT_SESSION_COOKIE)?.value;
  const session = await verifyApplicantSessionToken(token, {
    enforceIdle: false,
  });

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const opts = await refreshedApplicantSessionCookieOptions(session);
  response.cookies.set(APPLICANT_SESSION_COOKIE, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });

  return response;
}
