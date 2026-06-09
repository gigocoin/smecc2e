export type CoordinatorNavId =
  | "overview"
  | "users"
  | "settings"
  | "regions"
  | "institutions"
  | "applicants"
  | "scholars"
  | "programs";

export type CoordinatorNavItem = {
  id: CoordinatorNavId;
  label: string;
  href: string;
};

export function buildDashboardNav(basePath: string): CoordinatorNavItem[] {
  const root = basePath.replace(/\/$/, "");
  return [
    { id: "overview", label: "Overview", href: root },
    { id: "users", label: "Users", href: `${root}/users` },
    { id: "settings", label: "Settings", href: `${root}/settings` },
  ];
}

export const COORDINATOR_NAV = buildDashboardNav("/coordinator");

export const ADMINISTRATOR_NAV = buildDashboardNav("/administrator");

export const EVALUATOR_NAV = buildDashboardNav("/evaluator");

export function isDashboardNavActive(
  itemId: CoordinatorNavId,
  pathname: string,
  section: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (itemId === "users") return pathname === `${root}/users`;
  if (itemId === "settings") return pathname === `${root}/settings`;
  if (itemId === "regions") return pathname === `${root}/regions`;
  if (itemId === "institutions") return pathname === `${root}/institutions`;
  if (itemId === "applicants") return pathname === `${root}/applicants`;
  if (itemId === "scholars") return pathname === `${root}/scholars`;
  if (itemId === "programs") return pathname === `${root}/programs`;
  if (pathname !== root) return false;
  if (itemId === "overview") return !section || section === "overview";
  return section === itemId;
}

export const COORDINATOR_SECTION_TITLES: Record<CoordinatorNavId, string> = {
  overview: "Overview",
  users: "Users",
  settings: "Settings",
  regions: "Regions",
  institutions: "Institutions",
  applicants: "Applicants",
  scholars: "Scholars",
  programs: "Programs",
};

export function isCoordinatorNavId(value: string | null): value is CoordinatorNavId {
  return (
    value === "overview" ||
    value === "users" ||
    value === "settings" ||
    value === "regions" ||
    value === "institutions" ||
    value === "applicants" ||
    value === "scholars" ||
    value === "programs"
  );
}
