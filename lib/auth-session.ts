import { cookies } from "next/headers";
import type { DashboardUser } from "./dashboard-users";
import { SESSION_IDLE_TIMEOUT_MS } from "./session-constants";

export const AUTH_SESSION_COOKIE = "smecc2e_auth";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export type SessionClaims = {
  publicId: string;
  role: DashboardUser["role"];
  exp: number;
  /** Last activity timestamp (ms). Absent on legacy tokens. */
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

export async function signSessionToken(
  publicId: string,
  role: DashboardUser["role"],
  options?: { exp?: number; iat?: number }
): Promise<string> {
  const exp = options?.exp ?? Date.now() + SESSION_TTL_MS;
  const iat = options?.iat ?? Date.now();
  const payload = `${publicId}.${role}.${exp}.${iat}`;
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

/** Returns signed session claims if token is valid and not expired. */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionClaims | null> {
  if (!token) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!(await hmacVerify(payload, sig))) return null;

  const parts = payload.split(".");
  if (parts.length !== 3 && parts.length !== 4) return null;

  const publicId = parts[0] ?? "";
  const roleRaw = parts[1] ?? "";
  const exp = parseInt(parts[2] ?? "", 10);
  if (!publicId || !Number.isFinite(exp) || Date.now() > exp) return null;
  if (parts.length === 4) {
    const iat = parseInt(parts[3] ?? "", 10);
    if (
      !Number.isFinite(iat) ||
      Date.now() - iat > SESSION_IDLE_TIMEOUT_MS
    ) {
      return null;
    }
  }

  let role: DashboardUser["role"];
  if (
    roleRaw === "Coordinator" ||
    roleRaw === "Evaluator" ||
    roleRaw === "Administrator"
  ) {
    role = roleRaw;
  } else if (roleRaw === "Reviewer") {
    role = "Evaluator"; // legacy session tokens
  } else {
    return null;
  }

  const iat =
    parts.length === 4 ? parseInt(parts[3] ?? "", 10) : undefined;

  return {
    publicId,
    role,
    exp,
    iat: Number.isFinite(iat) ? iat : undefined,
  };
}

function sessionCookieMaxAge(exp: number): number {
  return Math.max(1, Math.floor((exp - Date.now()) / 1000));
}

export async function authSessionCookieOptions(
  publicId: string,
  role: DashboardUser["role"]
) {
  const exp = Date.now() + SESSION_TTL_MS;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookieMaxAge(exp),
    value: await signSessionToken(publicId, role, { exp }),
  };
}

export async function refreshedAuthSessionCookieOptions(claims: SessionClaims) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookieMaxAge(claims.exp),
    value: await signSessionToken(claims.publicId, claims.role, {
      exp: claims.exp,
      iat: Date.now(),
    }),
  };
}

export async function getSessionPublicIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  return session?.publicId ?? null;
}

export function clearAuthSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    value: "",
  };
}
