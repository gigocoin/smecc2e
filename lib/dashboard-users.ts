export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  institution: string;
  profileImageUrl: string | null;
  role: "Coordinator" | "Evaluator" | "Administrator";
  status: "Active" | "Inactive";
};

export type CreateUserInput = {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  institution: string;
  profileImageUrl?: string | null;
  role: DashboardUser["role"];
  status: DashboardUser["status"];
};

export type UpdateUserInput = {
  name: string;
  email: string;
  phoneNumber: string;
  institution: string;
  profileImageUrl?: string | null;
  role: DashboardUser["role"];
  status: DashboardUser["status"];
  /** Omit or leave empty to keep the current password. */
  password?: string;
};

/** Default password for users created via `prisma db seed` (change in production). */
export const DEFAULT_SEED_USER_PASSWORD = "ChangeMe123!";
