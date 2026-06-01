import { NextResponse } from "next/server";
import type { ApplicationPayload } from "@/lib/application-types";
import {
  assertApplicantEmailMatchesSession,
  assertApplicantPayloadMatchesSession,
} from "@/lib/applicant-application-auth";
import {
  ApplicantAuthError,
  requireApplicantPasswordChanged,
} from "@/lib/applicant-auth-service";
import {
  DuplicateApplicationError,
  findDraftByEmail,
  upsertDraftApplication,
} from "@/lib/applications-service";
import {
  APPLICANT_SESSION_COOKIE,
  getApplicantSessionFromCookie,
  refreshedApplicantSessionCookieOptions,
} from "@/lib/applicant-session";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

async function refreshApplicantSessionCookie(
  response: NextResponse
): Promise<NextResponse> {
  const session = await getApplicantSessionFromCookie();
  if (!session) return response;

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

export async function GET(request: Request) {
  try {
    const user = await requireApplicantPasswordChanged();
    const email = new URL(request.url).searchParams.get("email")?.trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    assertApplicantEmailMatchesSession(user, email);

    const application = await findDraftByEmail(email);
    return refreshApplicantSessionCookie(
      NextResponse.json({ application })
    );
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/applications/draft", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load application draft from database",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApplicantPasswordChanged();
    const body = (await request.json()) as ApplicationPayload & {
      currentPage?: number;
    };
    const currentPage = body.currentPage;
    if (!currentPage || currentPage < 1) {
      return NextResponse.json(
        { error: "currentPage is required" },
        { status: 400 }
      );
    }

    const { currentPage: _page, ...payload } = body;
    assertApplicantPayloadMatchesSession(user, payload);

    const application = await upsertDraftApplication(payload, currentPage);
    return refreshApplicantSessionCookie(
      NextResponse.json({ application })
    );
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    if (err instanceof DuplicateApplicationError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("POST /api/applications/draft", err);
    const connectionError = toUserFacingDatabaseError(err);
    const message =
      err instanceof Error ? err.message : "Failed to save application draft";
    return NextResponse.json(
      { error: connectionError ?? message },
      { status: connectionError ? 503 : 400 }
    );
  }
}
