import { CoordinatorUsers } from "../../components/coordinator-users";
import { resolveApiError } from "@/lib/prisma-errors";
import { listUsers } from "@/lib/users-service";
import { listUniversities } from "@/lib/universities-service";

export const metadata = {
  title: "Users | Evaluator | SMECC2E",
  description: "SMECC2E evaluator dashboard users.",
};

export const dynamic = "force-dynamic";

export default async function EvaluatorUsersPage() {
  let initialUsers: Awaited<ReturnType<typeof listUsers>> = [];
  let initialLoadError: string | null = null;
  let initialInstitutions: string[] = [];

  try {
    initialUsers = await listUsers();
  } catch (err) {
    console.error("EvaluatorUsersPage: failed to load users", err);
    initialLoadError = resolveApiError(
      err,
      "Failed to load users from database."
    );
  }

  try {
    const universities = await listUniversities();
    initialInstitutions = universities.map((u) => u.name);
  } catch (err) {
    console.error("EvaluatorUsersPage: failed to load institutions", err);
  }

  return (
    <CoordinatorUsers
      initialUsers={initialUsers}
      initialLoadError={initialLoadError}
      initialInstitutions={initialInstitutions}
    />
  );
}
