export const DASHBOARD_USER_ROLES = [
  "Coordinator",
  "Evaluator",
  "Administrator",
  "Super Admin",
  "Finance Coordinator",
  "Finance Officer",
  "Finance Auditor",
] as const;

export type DashboardUserRole = (typeof DASHBOARD_USER_ROLES)[number];

export const SUPER_ADMIN_ROLE: DashboardUserRole = "Super Admin";

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === SUPER_ADMIN_ROLE;
}

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  institution: string;
  isFocalPerson: boolean;
  profileImageUrl: string | null;
  role: DashboardUserRole;
  status: "Active" | "Inactive";
};

/** Role options available to a viewer in create/edit user forms. */
export function rolesVisibleTo(
  viewerRole: DashboardUserRole | null | undefined
): DashboardUserRole[] {
  if (isSuperAdminRole(viewerRole)) return [...DASHBOARD_USER_ROLES];
  return DASHBOARD_USER_ROLES.filter((role) => role !== SUPER_ADMIN_ROLE);
}

/** Hide Super Admin accounts from every non–Super Admin viewer. */
export function usersVisibleTo(
  users: DashboardUser[],
  viewerRole: DashboardUserRole | null | undefined
): DashboardUser[] {
  if (isSuperAdminRole(viewerRole)) return users;
  return users.filter((user) => user.role !== SUPER_ADMIN_ROLE);
}

export type CreateUserInput = {
  name: string;
  email: string;
  address?: string;
  phoneNumber: string;
  password: string;
  institution: string;
  isFocalPerson?: boolean;
  profileImageUrl?: string | null;
  role: DashboardUser["role"];
  status: DashboardUser["status"];
};

export type UpdateUserInput = {
  name: string;
  email: string;
  address?: string;
  phoneNumber: string;
  institution: string;
  isFocalPerson?: boolean;
  profileImageUrl?: string | null;
  role: DashboardUser["role"];
  status: DashboardUser["status"];
  /** Omit or leave empty to keep the current password. */
  password?: string;
};

export function isDashboardUserRole(value: string): value is DashboardUserRole {
  return (DASHBOARD_USER_ROLES as readonly string[]).includes(value);
}

export function canAssignRole(
  viewerRole: DashboardUserRole | null | undefined,
  targetRole: string
): boolean {
  if (!isDashboardUserRole(targetRole)) return false;
  if (targetRole === SUPER_ADMIN_ROLE) return isSuperAdminRole(viewerRole);
  return true;
}

/** Default password for users created via `prisma db seed` (change in production). */
export const DEFAULT_SEED_USER_PASSWORD = "ChangeMe123!";
