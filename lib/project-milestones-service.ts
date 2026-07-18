import type { ProjectMilestone as PrismaProjectMilestone, ProjectTrackStatus } from "@prisma/client";
import { prisma } from "./prisma";
import {
  isMilestoneStatus,
  normalizeProjectMilestone,
  parseMilestoneDueDate,
  type MilestoneStatus,
  type ProjectMilestone,
} from "./project-milestones";

const STATUS_TO_PRISMA: Record<MilestoneStatus, ProjectTrackStatus> = {
  "Not Started": "NOT_STARTED",
  "On-going": "ON_GOING",
  Completed: "COMPLETED",
};

const STATUS_FROM_PRISMA: Record<ProjectTrackStatus, MilestoneStatus> = {
  NOT_STARTED: "Not Started",
  ON_GOING: "On-going",
  COMPLETED: "Completed",
};

function formatDueDateForUi(value: Date | null): string {
  if (!value) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDueDateForDb(value: string | undefined | null): Date | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseMilestoneDueDate(trimmed);
  if (!parsed) {
    throw new Error("Enter a valid due date");
  }
  return parsed;
}

function parseStatusForDb(
  value: string | undefined | null
): ProjectTrackStatus {
  if (value == null || !String(value).trim()) return "NOT_STARTED";
  const trimmed = String(value).trim();
  if (isMilestoneStatus(trimmed)) return STATUS_TO_PRISMA[trimmed];
  if (
    trimmed === "NOT_STARTED" ||
    trimmed === "ON_GOING" ||
    trimmed === "COMPLETED"
  ) {
    return trimmed;
  }
  throw new Error(
    'Invalid status. Use "Not Started", "On-going", or "Completed".'
  );
}

export function mapProjectMilestone(
  row: PrismaProjectMilestone
): ProjectMilestone {
  return {
    id: row.id,
    name: row.name,
    milestoneNo: row.milestoneNo,
    workPackageNo: row.workPackageNo,
    leadBeneficiary: row.leadBeneficiary,
    meansOfVerification: row.meansOfVerification,
    dueDate: formatDueDateForUi(row.dueDate),
    status: STATUS_FROM_PRISMA[row.status],
  };
}

export type CreateProjectMilestoneInput = {
  name: string;
  milestoneNo?: string;
  workPackageNo?: string;
  leadBeneficiary?: string;
  meansOfVerification?: string;
  dueDate?: string;
  status?: string;
};

export async function listProjectMilestones(): Promise<ProjectMilestone[]> {
  const rows = await prisma.projectMilestone.findMany({
    orderBy: [{ dueDate: "asc" }, { name: "asc" }],
  });
  return rows.map(mapProjectMilestone);
}

export async function createProjectMilestone(
  input: CreateProjectMilestoneInput
): Promise<ProjectMilestone> {
  const name = input.name?.trim() ?? "";
  if (!name) {
    throw new Error("Milestone name is required");
  }

  const row = await prisma.projectMilestone.create({
    data: {
      name,
      milestoneNo: input.milestoneNo?.trim() ?? "",
      workPackageNo: input.workPackageNo?.trim() ?? "",
      leadBeneficiary: input.leadBeneficiary?.trim() ?? "",
      meansOfVerification: input.meansOfVerification?.trim() ?? "",
      dueDate: parseDueDateForDb(input.dueDate),
      status: parseStatusForDb(input.status),
    },
  });
  return mapProjectMilestone(row);
}

export async function createProjectMilestonesBulk(
  inputs: CreateProjectMilestoneInput[]
): Promise<ProjectMilestone[]> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("No milestones to import");
  }

  const created: ProjectMilestone[] = [];
  for (const input of inputs) {
    created.push(await createProjectMilestone(input));
  }
  return created;
}

export async function updateProjectMilestoneStatus(
  id: string,
  status: string
): Promise<ProjectMilestone> {
  const existing = await prisma.projectMilestone.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Milestone not found");
  }

  const row = await prisma.projectMilestone.update({
    where: { id },
    data: { status: parseStatusForDb(status) },
  });
  return mapProjectMilestone(row);
}

export async function deleteAllProjectMilestones(): Promise<number> {
  const result = await prisma.projectMilestone.deleteMany({});
  return result.count;
}

export type ProjectMilestoneInput = {
  id?: string;
  name?: string;
  milestoneNo?: string;
  workPackageNo?: string;
  leadBeneficiary?: string;
  meansOfVerification?: string;
  dueDate?: string;
  status?: string;
};

/**
 * Persist the full milestones list: update existing, create new, delete removed.
 */
export async function saveProjectMilestones(
  inputs: ProjectMilestoneInput[]
): Promise<ProjectMilestone[]> {
  if (!Array.isArray(inputs)) {
    throw new Error("Milestones payload must be an array");
  }

  const normalized = inputs.map((input, index) => {
    const item = normalizeProjectMilestone(input);
    if (!item) {
      throw new Error(`Milestone ${index + 1}: Name is required`);
    }
    if (item.dueDate && !parseMilestoneDueDate(item.dueDate)) {
      throw new Error(
        `Milestone "${item.name}": Invalid due date "${item.dueDate}"`
      );
    }
    return item;
  });

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.projectMilestone.findMany({
        select: { id: true },
      });
      const existingIds = new Set(existing.map((row) => row.id));
      const incomingIds = new Set(normalized.map((item) => item.id));

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.projectMilestone.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      const toUpdate = normalized.filter((item) => existingIds.has(item.id));
      const toCreate = normalized.filter((item) => !existingIds.has(item.id));

      for (const item of toUpdate) {
        await tx.projectMilestone.update({
          where: { id: item.id },
          data: {
            name: item.name,
            milestoneNo: item.milestoneNo,
            workPackageNo: item.workPackageNo,
            leadBeneficiary: item.leadBeneficiary,
            meansOfVerification: item.meansOfVerification,
            dueDate: parseDueDateForDb(item.dueDate),
            status: parseStatusForDb(item.status),
          },
        });
      }

      if (toCreate.length > 0) {
        await tx.projectMilestone.createMany({
          data: toCreate.map((item) => ({
            id: item.id,
            name: item.name,
            milestoneNo: item.milestoneNo,
            workPackageNo: item.workPackageNo,
            leadBeneficiary: item.leadBeneficiary,
            meansOfVerification: item.meansOfVerification,
            dueDate: parseDueDateForDb(item.dueDate),
            status: parseStatusForDb(item.status),
          })),
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  return listProjectMilestones();
}
