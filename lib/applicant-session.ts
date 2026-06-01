import { cookies } from "next/headers";
import { APPLICANT_SESSION_IDLE_TIMEOUT_MS } from "./session-constants";

export const APPLICANT_SESSION_COOKIE = "smecc2e_applicant_auth";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ApplicantSessionClaims = {
  email: string;
  applicantId: string | null;
  mustChangePassword: boolean;
  exp: number;
  iat?: number;
};

function sessionSecret(): string {
  const secret =
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[SMECC2E] AUTH_SESSION_SECRET is not set. Using an insecure default."
    );
  }
  return "smecc2e-dev-session-secret-change-in-production";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array | null {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(payload: string, sig: string): Promise<boolean> {
  const sigBytes = base64UrlDecode(sig);
  if (!sigBytes) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    new Uint8Array(sigBytes),
    enc.encode(payload)
  );
}

function encodeEmailForToken(email: string): string {
  return base64UrlEncode(new TextEncoder().encode(email));
}

function decodeEmailFromToken(encoded: string): string | null {
  const bytes = base64UrlDecode(encoded);
  if (!bytes) return null;
  return new TextDecoder().decode(bytes);
}

export async function signApplicantSessionToken(
  email: string,
  applicantId: string | null,
  mustChangePassword: boolean,
  options?: { exp?: number; iat?: number }
): Promise<string> {
  const exp = options?.exp ?? Date.now() + SESSION_TTL_MS;
  const iat = options?.iat ?? Date.now();
  const emailEnc = encodeEmailForToken(email);
  const appId = applicantId ?? "";
  const mcp = mustChangePassword ? "1" : "0";
  const payload = `${emailEnc}.${appId}.${mcp}.${exp}.${iat}`;
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function verifyApplicantSessionToken(
  token: string | undefined,
  options?: { enforceIdle?: boolean }
): Promise<ApplicantSessionClaims | null> {
  const enforceIdle = options?.enforceIdle !== false;
  if (!token) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!(await hmacVerify(payload, sig))) return null;

  const parts = payload.split(".");
  if (parts.length !== 5) return null;

  const email = decodeEmailFromToken(parts[0] ?? "");
  const applicantId = parts[1] || null;
  const mustChangePassword = parts[2] === "1";
  const exp = parseInt(parts[3] ?? "", 10);
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;

  const iat = parseInt(parts[4] ?? "", 10);
  if (!Number.isFinite(iat)) return null;
  if (enforceIdle && Date.now() - iat > APPLICANT_SESSION_IDLE_TIMEOUT_MS) {
    return null;
  }

  return {
    email,
    applicantId,
    mustChangePassword,
    exp,
    iat,
  };
}

function sessionCookieMaxAge(exp: number): number {
  return Math.max(1, Math.floor((exp - Date.now()) / 1000));
}

export async function applicantSessionCookieOptions(
  email: string,
  applicantId: string | null,
  mustChangePassword: boolean
) {
  const exp = Date.now() + SESSION_TTL_MS;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookieMaxAge(exp),
    value: await signApplicantSessionToken(
      email,
      applicantId,
      mustChangePassword,
      { exp }
    ),
  };
}

export async function refreshedApplicantSessionCookieOptions(
  claims: ApplicantSessionClaims
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookieMaxAge(claims.exp),
    value: await signApplicantSessionToken(
      claims.email,
      claims.applicantId,
      claims.mustChangePassword,
      { exp: claims.exp, iat: Date.now() }
    ),
  };
}

export async function getApplicantSessionFromCookie(): Promise<ApplicantSessionClaims | null> {
  const jar = await cookies();
  const token = jar.get(APPLICANT_SESSION_COOKIE)?.value;
  return verifyApplicantSessionToken(token);
}

export function clearApplicantSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    value: "",
  };
}
