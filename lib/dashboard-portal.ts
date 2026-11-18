import type { DashboardUser } from "./dashboard-users";

export type DashboardPortalKey =
  | "coordinator"
  | "administrator"
  | "evaluator"
  | "finance_coordinator"
  | "finance_officer"
  | "finance_auditor";

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
    allowedRoles: ["Coordinator", "Super Admin"],
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
  finance_coordinator: {
    key: "finance_coordinator",
    basePath: "/finance-coordinator",
    label: "Finance Coordinator",
    allowedRoles: ["Finance Coordinator"],
  },
  finance_officer: {
    key: "finance_officer",
    basePath: "/finance-officer",
    label: "Finance Officer",
    allowedRoles: ["Finance Officer"],
  },
  finance_auditor: {
    key: "finance_auditor",
    basePath: "/finance-auditor",
    label: "Finance Auditor",
    allowedRoles: ["Finance Auditor"],
  },
};

export function portalKeyFromPath(pathname: string): DashboardPortalKey | null {
  if (pathname.startsWith("/administrator")) return "administrator";
  if (pathname.startsWith("/evaluator")) return "evaluator";
  if (pathname.startsWith("/finance-coordinator")) return "finance_coordinator";
  if (pathname.startsWith("/finance-officer")) return "finance_officer";
  if (pathname.startsWith("/finance-auditor")) return "finance_auditor";
  if (pathname.startsWith("/coordinator")) return "coordinator";
  return null;
}

export function portalForRole(
  role: DashboardUser["role"]
): DashboardPortalKey | null {
  if (role === "Finance Coordinator") return "finance_coordinator";
  if (role === "Finance Officer") return "finance_officer";
  if (role === "Finance Auditor") return "finance_auditor";
  if (role === "Coordinator" || role === "Super Admin") return "coordinator";
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
    redirect.startsWith("/evaluator") ||
    redirect.startsWith("/finance-coordinator") ||
    redirect.startsWith("/finance-officer") ||
    redirect.startsWith("/finance-auditor")
  ) {
    return redirect;
  }
  return fallback;
}
