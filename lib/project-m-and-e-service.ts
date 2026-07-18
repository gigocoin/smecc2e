import type { ProjectMandEIndicator as PrismaMandE } from "@prisma/client";
import { prisma } from "./prisma";
import {
  calculateMandECompletionRate,
  normalizeMandEIndicator,
  type ProjectMandEIndicator,
} from "./project-m-and-e";

export function mapProjectMandE(row: PrismaMandE): ProjectMandEIndicator {
  return {
    id: row.id,
    indicator: row.indicator,
    type: row.type,
    unitOfMeasurement: row.unitOfMeasurement,
    baselineValue: row.baselineValue,
    targetValue: row.targetValue,
    currentStatus: row.currentStatus,
    completionRate: calculateMandECompletionRate(
      row.currentStatus,
      row.targetValue,
      row.baselineValue
    ),
  };
}

export type ProjectMandEInput = {
  id?: string;
  indicator?: string;
  type?: string;
  unitOfMeasurement?: string;
  baselineValue?: string;
  targetValue?: string;
  currentStatus?: string;
  completionRate?: number;
};

export async function listProjectMandE(): Promise<ProjectMandEIndicator[]> {
  const rows = await prisma.projectMandEIndicator.findMany({
    orderBy: [{ indicator: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapProjectMandE);
}

/**
 * Persist the full M&E list: update existing, create new, delete removed.
 */
export async function saveProjectMandE(
  inputs: ProjectMandEInput[]
): Promise<ProjectMandEIndicator[]> {
  if (!Array.isArray(inputs)) {
    throw new Error("M&E payload must be an array");
  }

  const normalized = inputs.map((input, index) => {
    const item = normalizeMandEIndicator(input);
    if (!item) {
      throw new Error(`Indicator ${index + 1}: Indicator name is required`);
    }
    return item;
  });

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.projectMandEIndicator.findMany({
        select: { id: true },
      });
      const existingIds = new Set(existing.map((row) => row.id));
      const incomingIds = new Set(normalized.map((item) => item.id));

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.projectMandEIndicator.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      const toUpdate = normalized.filter((item) => existingIds.has(item.id));
      const toCreate = normalized.filter((item) => !existingIds.has(item.id));

      for (const item of toUpdate) {
        await tx.projectMandEIndicator.update({
          where: { id: item.id },
          data: {
            indicator: item.indicator,
            type: item.type,
            unitOfMeasurement: item.unitOfMeasurement,
            baselineValue: item.baselineValue,
            targetValue: item.targetValue,
            currentStatus: item.currentStatus,
            completionRate: item.completionRate,
          },
        });
      }

      if (toCreate.length > 0) {
        await tx.projectMandEIndicator.createMany({
          data: toCreate.map((item) => ({
            id: item.id,
            indicator: item.indicator,
            type: item.type,
            unitOfMeasurement: item.unitOfMeasurement,
            baselineValue: item.baselineValue,
            targetValue: item.targetValue,
            currentStatus: item.currentStatus,
            completionRate: item.completionRate,
          })),
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  return listProjectMandE();
}
