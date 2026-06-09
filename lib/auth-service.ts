import type { DashboardUser } from "./dashboard-users";
import {
  defaultDashboardPathForRole,
  safeDashboardRedirect,
} from "./dashboard-portal";
import { mapPrismaUser } from "./prisma-mappers";
import { verifyPassword } from "./password";
import { prisma } from "./prisma";
import { withPrismaRetry } from "./prisma-errors";
import { getSessionPublicIdFromCookie } from "./auth-session";

const AUTH_DB_RETRY = { attempts: 3, delayMs: 2000 } as const;

export class AuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: DashboardUser } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { error: "Email and password are required." };
  }

  const row = await withPrismaRetry(
    () => prisma.user.findUnique({ where: { email: normalized } }),
    AUTH_DB_RETRY
  );
  if (!row || row.status !== "ACTIVE") {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  return { user: mapPrismaUser(row) };
}

export async function getSessionUser(): Promise<DashboardUser | null> {
  const publicId = await getSessionPublicIdFromCookie();
  if (!publicId) return null;

  const row = await withPrismaRetry(
    () => prisma.user.findUnique({ where: { publicId } }),
    AUTH_DB_RETRY
  );
  if (!row || row.status !== "ACTIVE") return null;

  return mapPrismaUser(row);
}

export async function requireSessionUser(): Promise<DashboardUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireCoordinatorSessionUser(): Promise<DashboardUser> {
  const user = await requireSessionUser();
  if (user.role !== "Coordinator") {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export async function requireAdministratorSessionUser(): Promise<DashboardUser> {
  const user = await requireSessionUser();
  if (user.role !== "Administrator") {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

/** Coordinators, administrators, and evaluators may access dashboard APIs. */
export async function requireDashboardSessionUser(): Promise<DashboardUser> {
  const user = await requireSessionUser();
  if (
    user.role !== "Coordinator" &&
    user.role !== "Administrator" &&
    user.role !== "Evaluator"
  ) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export async function requireCoordinatorOrAdministratorSessionUser(): Promise<DashboardUser> {
  const user = await requireSessionUser();
  if (user.role !== "Coordinator" && user.role !== "Administrator") {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export function safeRedirectPath(
  redirect: string | null | undefined,
  role: DashboardUser["role"],
  fallback?: string
): string {
  const defaultFallback = fallback ?? defaultDashboardPathForRole(role);
  return safeDashboardRedirect(redirect, defaultFallback);
}
