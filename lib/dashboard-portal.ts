import type { DashboardUser } from "./dashboard-users";

export type DashboardPortalKey = "coordinator" | "administrator" | "evaluator";

export type DashboardPortalConfig = {
  key: DashboardPortalKey;
  basePath: string;
  label: string;
  allowedRoles: DashboardUser["role"][];
};

export const DASHBOARD_PORTALS: Record<
  DashboardPortalKey,
  DashboardPortalConfig
> = {
  coordinator: {
    key: "coordinator",
    basePath: "/coordinator",
    label: "Coordinator",
    allowedRoles: ["Coordinator"],
  },
  administrator: {
    key: "administrator",
    basePath: "/administrator",
    label: "Administrator",
    allowedRoles: ["Administrator"],
  },
  evaluator: {
    key: "evaluator",
    basePath: "/evaluator",
    label: "Evaluator",
    allowedRoles: ["Evaluator"],
  },
};

export function portalKeyFromPath(pathname: string): DashboardPortalKey | null {
  if (pathname.startsWith("/administrator")) return "administrator";
  if (pathname.startsWith("/evaluator")) return "evaluator";
  if (pathname.startsWith("/coordinator")) return "coordinator";
  return null;
}

export function portalForRole(
  role: DashboardUser["role"]
): DashboardPortalKey | null {
  if (role === "Coordinator") return "coordinator";
  if (role === "Administrator") return "administrator";
  if (role === "Evaluator") return "evaluator";
  return null;
}

export function defaultDashboardPathForRole(role: DashboardUser["role"]): string {
  const key = portalForRole(role);
  return key ? DASHBOARD_PORTALS[key].basePath : "/login";
}

export function isDashboardPath(pathname: string): boolean {
  return portalKeyFromPath(pathname) !== null;
}

export function safeDashboardRedirect(
  redirect: string | null | undefined,
  fallback: string
): string {
  if (!redirect || redirect.includes("//")) return fallback;
  if (
    redirect.startsWith("/coordinator") ||
    redirect.startsWith("/administrator") ||
    redirect.startsWith("/evaluator")
  ) {
    return redirect;
  }
  return fallback;
}
