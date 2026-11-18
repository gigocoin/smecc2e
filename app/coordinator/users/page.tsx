import { CoordinatorUsers } from "../../components/coordinator-users";
import { getSessionUser } from "@/lib/auth-service";
import { usersVisibleTo } from "@/lib/dashboard-users";
import { resolveApiError } from "@/lib/prisma-errors";
import { listUsers } from "@/lib/users-service";
import { listUniversities } from "@/lib/universities-service";

export const metadata = {
  title: "Users | Coordinator | SMECC2E",
  description: "SMECC2E coordinator dashboard users.",
};

export const dynamic = "force-dynamic";

export default async function CoordinatorUsersPage() {
  let initialUsers: Awaited<ReturnType<typeof listUsers>> = [];
  let initialLoadError: string | null = null;
  let initialInstitutions: string[] = [];

  try {
    const [sessionUser, users] = await Promise.all([
      getSessionUser(),
      listUsers(),
    ]);
    initialUsers = usersVisibleTo(users, sessionUser?.role);
  } catch (err) {
    console.error("CoordinatorUsersPage: failed to load users", err);
    initialLoadError = resolveApiError(
      err,
      "Failed to load users from database."
    );
  }

  try {
    const universities = await listUniversities();
    initialInstitutions = universities.map((u) => u.name);
  } catch (err) {
    console.error("CoordinatorUsersPage: failed to load institutions", err);
  }

  return (
    <CoordinatorUsers
      initialUsers={initialUsers}
      initialLoadError={initialLoadError}
      initialInstitutions={initialInstitutions}
    />
  );
}
