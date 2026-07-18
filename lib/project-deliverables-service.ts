import type {
  ProjectDeliverable as PrismaProjectDeliverable,
  ProjectTrackStatus,
} from "@prisma/client";
import { prisma } from "./prisma";
import {
  isDeliverableStatus,
  normalizeProjectDeliverable,
  parseDeliverableDueDate,
  type DeliverableStatus,
  type ProjectDeliverable,
} from "./project-deliverables";

const STATUS_TO_PRISMA: Record<DeliverableStatus, ProjectTrackStatus> = {
  "Not Started": "NOT_STARTED",
  "On-going": "ON_GOING",
  Completed: "COMPLETED",
};

const STATUS_FROM_PRISMA: Record<ProjectTrackStatus, DeliverableStatus> = {
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
  const parsed = parseDeliverableDueDate(trimmed);
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
  if (isDeliverableStatus(trimmed)) return STATUS_TO_PRISMA[trimmed];
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

export function mapProjectDeliverable(
  row: PrismaProjectDeliverable
): ProjectDeliverable {
  return {
    id: row.id,
    workPackageNo: row.workPackageNo,
    deliverableNo: row.deliverableNo,
    name: row.name,
    description: row.description,
    leadBeneficiary: row.leadBeneficiary,
    dueDate: formatDueDateForUi(row.dueDate),
    status: STATUS_FROM_PRISMA[row.status],
  };
}

export type ProjectDeliverableInput = {
  id?: string;
  workPackageNo?: string;
  deliverableNo?: string;
  name?: string;
  description?: string;
  leadBeneficiary?: string;
  dueDate?: string;
  status?: string;
};

export async function listProjectDeliverables(): Promise<ProjectDeliverable[]> {
  const rows = await prisma.projectDeliverable.findMany({
    orderBy: [{ dueDate: "asc" }, { name: "asc" }],
  });
  return rows.map(mapProjectDeliverable);
}

/**
 * Persist the full deliverables list: update existing, create new, delete removed.
 */
export async function saveProjectDeliverables(
  inputs: ProjectDeliverableInput[]
): Promise<ProjectDeliverable[]> {
  if (!Array.isArray(inputs)) {
    throw new Error("Deliverables payload must be an array");
  }

  const normalized = inputs.map((input, index) => {
    const item = normalizeProjectDeliverable(input);
    if (!item) {
      throw new Error(`Deliverable ${index + 1}: Name is required`);
    }
    if (item.dueDate && !parseDeliverableDueDate(item.dueDate)) {
      throw new Error(
        `Deliverable "${item.name}": Invalid due date "${item.dueDate}"`
      );
    }
    return item;
  });

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.projectDeliverable.findMany({
        select: { id: true },
      });
      const existingIds = new Set(existing.map((row) => row.id));
      const incomingIds = new Set(normalized.map((item) => item.id));

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.projectDeliverable.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      const toUpdate = normalized.filter((item) => existingIds.has(item.id));
      const toCreate = normalized.filter((item) => !existingIds.has(item.id));

      for (const item of toUpdate) {
        await tx.projectDeliverable.update({
          where: { id: item.id },
          data: {
            workPackageNo: item.workPackageNo,
            deliverableNo: item.deliverableNo,
            name: item.name,
            description: item.description,
            leadBeneficiary: item.leadBeneficiary,
            dueDate: parseDueDateForDb(item.dueDate),
            status: parseStatusForDb(item.status),
          },
        });
      }

      if (toCreate.length > 0) {
        await tx.projectDeliverable.createMany({
          data: toCreate.map((item) => ({
            id: item.id,
            workPackageNo: item.workPackageNo,
            deliverableNo: item.deliverableNo,
            name: item.name,
            description: item.description,
            leadBeneficiary: item.leadBeneficiary,
            dueDate: parseDueDateForDb(item.dueDate),
            status: parseStatusForDb(item.status),
          })),
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  return listProjectDeliverables();
}
