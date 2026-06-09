import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth-session";
import {
  APPLICANT_SESSION_COOKIE,
  verifyApplicantSessionToken,
} from "@/lib/applicant-session";
import {
  DASHBOARD_PORTALS,
  isDashboardPath,
  portalForRole,
  portalKeyFromPath,
  safeDashboardRedirect,
} from "@/lib/dashboard-portal";

const APPLICANT_PUBLIC_PATHS = new Set([
  "/applicant/login",
  "/applicant/forgot-password",
  "/applicant/reset-password",
  "/application/login",
  "/application/forgot-password",
  "/application/reset-password",
]);

const APPLICANT_CONTINUE_PATH = "/applicant/application?page=2";
const APPLICANT_CHANGE_PASSWORD_PATH = `/applicant/change-password?redirect=${encodeURIComponent(APPLICANT_CONTINUE_PATH)}`;

function isApplicantPublicPath(pathname: string): boolean {
  return APPLICANT_PUBLIC_PATHS.has(pathname);
}

function isApplicantPath(pathname: string): boolean {
  return pathname === "/applicant" || pathname.startsWith("/applicant/");
}

function shouldBypassApplicantLoginRedirect(pathname: string): boolean {
  return (
    pathname === "/applicant/reset-password" ||
    pathname === "/applicant/forgot-password" ||
    pathname === "/application/reset-password" ||
    pathname === "/application/forgot-password"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isLoggedIn = Boolean(session);

  const applicantToken = request.cookies.get(APPLICANT_SESSION_COOKIE)?.value;
  const applicantSession = await verifyApplicantSessionToken(applicantToken);
  const applicantLoggedIn = Boolean(applicantSession);

  if (isApplicantPath(pathname)) {
    if (isApplicantPublicPath(pathname)) {
      const freshVerification =
        request.nextUrl.searchParams.get("verified") === "1";
      if (
        applicantLoggedIn &&
        applicantSession &&
        !freshVerification &&
        !shouldBypassApplicantLoginRedirect(pathname)
      ) {
        const target = applicantSession.mustChangePassword
          ? APPLICANT_CHANGE_PASSWORD_PATH
          : APPLICANT_CONTINUE_PATH;
        return NextResponse.redirect(new URL(target, request.url));
      }
      return NextResponse.next();
    }

    if (!applicantLoggedIn) {
      const loginUrl = new URL("/applicant/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (
      applicantSession?.mustChangePassword &&
      pathname !== "/applicant/change-password"
    ) {
      return NextResponse.redirect(
        new URL(APPLICANT_CHANGE_PASSWORD_PATH, request.url)
      );
    }

    if (
      pathname === "/applicant/change-password" &&
      applicantSession &&
      !applicantSession.mustChangePassword
    ) {
      return NextResponse.redirect(new URL(APPLICANT_CONTINUE_PATH, request.url));
    }

    return NextResponse.next();
  }

  if (isDashboardPath(pathname)) {
    const portalKey = portalKeyFromPath(pathname);
    if (!portalKey) {
      return NextResponse.next();
    }

    const portal = DASHBOARD_PORTALS[portalKey];
    const roleAllowed =
      isLoggedIn &&
      session?.role &&
      portal.allowedRoles.includes(session.role);

    if (!roleAllowed) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname === "/login" && isLoggedIn && session?.role) {
    const portalKey = portalForRole(session.role);
    if (portalKey) {
      const redirect = request.nextUrl.searchParams.get("redirect");
      const fallback = DASHBOARD_PORTALS[portalKey].basePath;
      const target = safeDashboardRedirect(redirect, fallback);
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  if (pathname === "/application") {
    const pageParam = request.nextUrl.searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    if (pageNum > 2 && !applicantLoggedIn) {
      const loginUrl = new URL("/applicant/login", request.url);
      loginUrl.searchParams.set("redirect", "/applicant/application");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isApplicantPublicPath(pathname)) {
    const freshVerification =
      request.nextUrl.searchParams.get("verified") === "1";
    if (
      applicantLoggedIn &&
      applicantSession &&
      !freshVerification &&
      !shouldBypassApplicantLoginRedirect(pathname)
    ) {
      const target = applicantSession.mustChangePassword
        ? APPLICANT_CHANGE_PASSWORD_PATH
        : APPLICANT_CONTINUE_PATH;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/coordinator/:path*",
    "/administrator/:path*",
    "/evaluator/:path*",
    "/login",
    "/application",
    "/application/:path*",
    "/applicant",
    "/applicant/:path*",
  ],
};
