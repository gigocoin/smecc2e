import type {
  ProjectTask as PrismaProjectTask,
  ProjectTaskStatus,
  ProjectWorkPackage,
  User,
} from "@prisma/client";
import { prisma } from "./prisma";
import {
  isTaskStatus,
  nextDuplicatedTaskCode,
  workPackageFromTaskCode,
  WORK_PACKAGE_TASK_CODE_PREFIX,
  type ProjectTask,
  type TaskStatus,
} from "./project-tasks";
import type { WorkPackageNavId } from "./coordinator-project-nav";

const STATUS_TO_PRISMA: Record<TaskStatus, ProjectTaskStatus> = {
  "Not Started": "NOT_STARTED",
  "On-going": "ON_GOING",
  Submitted: "SUBMITTED",
  Completed: "COMPLETED",
  Rejected: "REJECTED",
};

const STATUS_FROM_PRISMA: Record<ProjectTaskStatus, TaskStatus> = {
  NOT_STARTED: "Not Started",
  ON_GOING: "On-going",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const WORK_PACKAGE_TO_PRISMA: Record<WorkPackageNavId, ProjectWorkPackage> = {
  project_management_coordination: "PROJECT_MANAGEMENT_COORDINATION",
  scholarship_selection_management: "SCHOLARSHIP_SELECTION_MANAGEMENT",
  communication_dissemination: "COMMUNICATION_DISSEMINATION",
};

const WORK_PACKAGE_FROM_PRISMA: Record<ProjectWorkPackage, WorkPackageNavId> = {
  PROJECT_MANAGEMENT_COORDINATION: "project_management_coordination",
  SCHOLARSHIP_SELECTION_MANAGEMENT: "scholarship_selection_management",
  COMMUNICATION_DISSEMINATION: "communication_dissemination",
};

export function parseWorkPackageForDb(
  value: string | undefined | null
): ProjectWorkPackage {
  if (value == null || !String(value).trim()) {
    throw new Error("Work package is required");
  }
  const trimmed = String(value).trim();
  if (trimmed in WORK_PACKAGE_TO_PRISMA) {
    return WORK_PACKAGE_TO_PRISMA[trimmed as WorkPackageNavId];
  }
  if (
    trimmed === "PROJECT_MANAGEMENT_COORDINATION" ||
    trimmed === "SCHOLARSHIP_SELECTION_MANAGEMENT" ||
    trimmed === "COMMUNICATION_DISSEMINATION"
  ) {
    return trimmed;
  }
  throw new Error("Invalid work package");
}

function parseStatusForDb(
  value: string | undefined | null
): ProjectTaskStatus {
  if (value == null || !String(value).trim()) return "NOT_STARTED";
  const trimmed = String(value).trim();
  if (isTaskStatus(trimmed)) return STATUS_TO_PRISMA[trimmed];
  if (
    trimmed === "NOT_STARTED" ||
    trimmed === "ON_GOING" ||
    trimmed === "SUBMITTED" ||
    trimmed === "COMPLETED" ||
    trimmed === "REJECTED"
  ) {
    return trimmed;
  }
  throw new Error(
    'Invalid status. Use "Not Started", "On-going", "Submitted", "Completed", or "Rejected".'
  );
}

type TaskRow = PrismaProjectTask & {
  leadPartners: Array<{
    user: Pick<User, "id" | "publicId" | "name">;
  }>;
};

function mapProjectTask(row: TaskRow): ProjectTask {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    meansOfVerification: row.meansOfVerification,
    status: STATUS_FROM_PRISMA[row.status],
    leadPartners: row.leadPartners.map((lp) => ({
      id: lp.user.publicId,
      name: lp.user.name,
    })),
    workPackage: WORK_PACKAGE_FROM_PRISMA[row.workPackage],
    isDuplicate: row.isDuplicate,
    duplicatedFromId: row.duplicatedFromId,
    completionComment: row.completionComment,
    completionFileName: row.completionFileName,
    completionFileUrl: row.completionFileUrl,
  };
}

const taskInclude = {
  leadPartners: {
    include: {
      user: { select: { id: true, publicId: true, name: true } },
    },
  },
} as const;

async function resolveUserInternalIds(
  leadPartnerPublicIds: string[]
): Promise<string[]> {
  const unique = [...new Set(leadPartnerPublicIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      OR: [{ publicId: { in: unique } }, { id: { in: unique } }],
    },
    select: { id: true, publicId: true },
  });

  const byPublic = new Map(users.map((u) => [u.publicId, u.id]));
  const byId = new Set(users.map((u) => u.id));

  const resolved: string[] = [];
  for (const ref of unique) {
    const internal = byPublic.get(ref) ?? (byId.has(ref) ? ref : null);
    if (!internal) {
      throw new Error(`Lead partner not found: ${ref}`);
    }
    resolved.push(internal);
  }
  return resolved;
}

export type CreateProjectTaskInput = {
  code?: string;
  description: string;
  meansOfVerification?: string;
  status?: string;
  workPackage: string;
  leadPartnerIds?: string[];
  isDuplicate?: boolean;
  duplicatedFromId?: string | null;
};

export type UpdateProjectTaskInput = {
  code?: string;
  description?: string;
  meansOfVerification?: string;
  status?: string;
  leadPartnerIds?: string[];
  completionComment?: string | null;
  completionFileName?: string | null;
  completionFileUrl?: string | null;
};

/** True when the user (public id or internal id) is a lead partner on the task. */
export async function isLeadPartnerOnProjectTask(
  taskId: string,
  userPublicOrInternalId: string
): Promise<boolean> {
  const userRef = userPublicOrInternalId.trim();
  if (!userRef) return false;

  const assignment = await prisma.projectTaskLeadPartner.findFirst({
    where: {
      taskId,
      user: {
        OR: [{ publicId: userRef }, { id: userRef }],
      },
    },
    select: { taskId: true },
  });
  return Boolean(assignment);
}

export async function getProjectTask(
  id: string
): Promise<ProjectTask | null> {
  const row = await prisma.projectTask.findUnique({
    where: { id },
    include: taskInclude,
  });
  return row ? mapProjectTask(row) : null;
}

/** Coordinator approval: Submitted → Completed. */
export async function approveProjectTaskSubmission(
  id: string
): Promise<ProjectTask | null> {
  const existing = await prisma.projectTask.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.status !== "SUBMITTED") {
    throw new Error("Only submitted tasks can be approved.");
  }
  return updateProjectTask(id, { status: "Completed" });
}

export async function listProjectTasks(
  workPackage?: string | null
): Promise<ProjectTask[]> {
  if (!workPackage) {
    const rows = await prisma.projectTask.findMany({
      include: taskInclude,
      orderBy: [{ code: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapProjectTask);
  }

  const wpNav = workPackage.trim() as WorkPackageNavId;
  const prismaWp = parseWorkPackageForDb(workPackage);
  const prefix =
    wpNav in WORK_PACKAGE_TASK_CODE_PREFIX
      ? WORK_PACKAGE_TASK_CODE_PREFIX[wpNav]
      : null;

  const rows = await prisma.projectTask.findMany({
    where: prefix
      ? {
          OR: [
            // Codes like T2.1 belong on Scholarship Selection & Management
            {
              code: {
                startsWith: prefix,
                mode: "insensitive",
              },
            },
            // Tasks without a T1/T2/T3 prefix stay on their stored work package
            {
              AND: [
                { workPackage: prismaWp },
                {
                  NOT: {
                    OR: [
                      { code: { startsWith: "T1", mode: "insensitive" } },
                      { code: { startsWith: "T2", mode: "insensitive" } },
                      { code: { startsWith: "T3", mode: "insensitive" } },
                    ],
                  },
                },
              ],
            },
          ],
        }
      : { workPackage: prismaWp },
    include: taskInclude,
    orderBy: [{ code: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapProjectTask);
}

export async function createProjectTask(
  input: CreateProjectTaskInput
): Promise<ProjectTask> {
  const description = input.description?.trim() ?? "";
  if (!description) {
    throw new Error("Task description is required");
  }

  const code = input.code?.trim() ?? "";
  const workPackageFromCode = workPackageFromTaskCode(code);
  const workPackage = parseWorkPackageForDb(
    workPackageFromCode ?? input.workPackage
  );
  const leadPartnerIds = await resolveUserInternalIds(
    input.leadPartnerIds ?? []
  );

  try {
    const row = await prisma.projectTask.create({
      data: {
        code,
        description,
        meansOfVerification: input.meansOfVerification?.trim() ?? "",
        status: parseStatusForDb(input.status),
        workPackage,
        isDuplicate: Boolean(input.isDuplicate),
        duplicatedFromId: input.duplicatedFromId?.trim() || null,
        leadPartners:
          leadPartnerIds.length > 0
            ? {
                create: leadPartnerIds.map((userId) => ({ userId })),
              }
            : undefined,
      },
      include: taskInclude,
    });
    return mapProjectTask(row);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new Error(
        code
          ? `Task code "${code}" already exists in this work package.`
          : "A task without a code already exists in this work package. Enter a unique task code."
      );
    }
    throw err;
  }
}

export async function updateProjectTask(
  id: string,
  input: UpdateProjectTaskInput
): Promise<ProjectTask | null> {
  const existing = await prisma.projectTask.findUnique({ where: { id } });
  if (!existing) return null;

  const data: {
    code?: string;
    description?: string;
    meansOfVerification?: string;
    status?: ProjectTaskStatus;
    workPackage?: ProjectWorkPackage;
    completionComment?: string | null;
    completionFileName?: string | null;
    completionFileUrl?: string | null;
  } = {};

  if (input.code !== undefined) data.code = input.code.trim();
  if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description) throw new Error("Task description is required");
    data.description = description;
  }
  if (input.meansOfVerification !== undefined) {
    data.meansOfVerification = input.meansOfVerification.trim();
  }
  if (input.status !== undefined) {
    data.status = parseStatusForDb(input.status);
  }
  if (input.completionComment !== undefined) {
    data.completionComment =
      input.completionComment === null
        ? null
        : String(input.completionComment).trim() || null;
  }
  if (input.completionFileName !== undefined) {
    data.completionFileName =
      input.completionFileName === null
        ? null
        : String(input.completionFileName).trim() || null;
  }
  if (input.completionFileUrl !== undefined) {
    data.completionFileUrl =
      input.completionFileUrl === null
        ? null
        : String(input.completionFileUrl).trim() || null;
  }

  const nextCode = input.code !== undefined ? input.code.trim() : existing.code;
  const workPackageFromCode = workPackageFromTaskCode(nextCode);
  if (workPackageFromCode) {
    data.workPackage = parseWorkPackageForDb(workPackageFromCode);
  }

  const replaceLeadPartners = input.leadPartnerIds !== undefined;
  const leadPartnerIds = replaceLeadPartners
    ? await resolveUserInternalIds(input.leadPartnerIds ?? [])
    : null;

  try {
    const row = await prisma.$transaction(async (tx) => {
      if (replaceLeadPartners) {
        await tx.projectTaskLeadPartner.deleteMany({ where: { taskId: id } });
        if (leadPartnerIds && leadPartnerIds.length > 0) {
          await tx.projectTaskLeadPartner.createMany({
            data: leadPartnerIds.map((userId) => ({ taskId: id, userId })),
          });
        }
      }

      return tx.projectTask.update({
        where: { id },
        data,
        include: taskInclude,
      });
    });
    return mapProjectTask(row);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      const code = input.code?.trim() ?? existing.code;
      throw new Error(
        code
          ? `Task code "${code}" already exists in this work package.`
          : "A task without a code already exists in this work package. Enter a unique task code."
      );
    }
    throw err;
  }
}

export async function deleteProjectTask(id: string): Promise<boolean> {
  const existing = await prisma.projectTask.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.projectTask.delete({ where: { id } });
  return true;
}

export async function duplicateProjectTask(
  id: string
): Promise<ProjectTask | null> {
  const existing = await prisma.projectTask.findUnique({
    where: { id },
    include: taskInclude,
  });
  if (!existing) return null;

  const siblings = await prisma.projectTask.findMany({
    where: { workPackage: existing.workPackage },
    select: { code: true },
  });

  return createProjectTask({
    code: nextDuplicatedTaskCode(
      existing.code,
      siblings.map((s) => s.code)
    ),
    description: existing.description,
    meansOfVerification: existing.meansOfVerification,
    status: STATUS_FROM_PRISMA[existing.status],
    workPackage: WORK_PACKAGE_FROM_PRISMA[existing.workPackage],
    leadPartnerIds: existing.leadPartners.map((lp) => lp.user.publicId),
    isDuplicate: true,
    duplicatedFromId: existing.id,
  });
}
