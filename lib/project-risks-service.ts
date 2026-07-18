import type { ProjectRisk as PrismaProjectRisk } from "@prisma/client";
import { prisma } from "./prisma";
import {
  normalizeProjectRisk,
  parseRiskMaterialised,
  parseYesNo,
  type ProjectRisk,
  type RiskMaterialisedAnswer,
  type YesNoAnswer,
} from "./project-risks";

/** Prisma enum values (includes PARTIALLY after schema sync). */
type PrismaYesNo = "YES" | "NO" | "PARTIALLY";

const YES_NO_TO_PRISMA: Record<Exclude<YesNoAnswer, "">, PrismaYesNo> = {
  Yes: "YES",
  No: "NO",
};

const MATERIALISED_TO_PRISMA: Record<
  Exclude<RiskMaterialisedAnswer, "">,
  PrismaYesNo
> = {
  Yes: "YES",
  No: "NO",
  Partially: "PARTIALLY",
};

const YES_NO_FROM_PRISMA: Record<string, YesNoAnswer> = {
  YES: "Yes",
  NO: "No",
};

const MATERIALISED_FROM_PRISMA: Record<string, RiskMaterialisedAnswer> = {
  YES: "Yes",
  NO: "No",
  PARTIALLY: "Partially",
};

function toPrismaYesNo(value: YesNoAnswer): PrismaYesNo | null {
  if (!value) return null;
  return YES_NO_TO_PRISMA[value];
}

function toPrismaMaterialised(
  value: RiskMaterialisedAnswer
): PrismaYesNo | null {
  if (!value) return null;
  return MATERIALISED_TO_PRISMA[value];
}

export function mapProjectRisk(row: PrismaProjectRisk): ProjectRisk {
  return {
    id: row.id,
    description: row.description,
    workPackage: row.workPackage,
    riskMitigationMeasures: row.riskMitigationMeasures,
    stateOfThePlayPeriod: row.stateOfThePlayPeriod,
    appliedMitigationMeasures:
      row.appliedMitigationMeasures
        ? (YES_NO_FROM_PRISMA[row.appliedMitigationMeasures] ??
          parseYesNo(row.appliedMitigationMeasures))
        : "",
    riskMaterialised: row.riskMaterialised
      ? (MATERIALISED_FROM_PRISMA[row.riskMaterialised] ??
        parseRiskMaterialised(row.riskMaterialised))
      : "",
    stateOfThePlayComments: row.stateOfThePlayComments,
    actions: row.actions,
  };
}

export type ProjectRiskInput = {
  id?: string;
  description?: string;
  workPackage?: string;
  riskMitigationMeasures?: string;
  stateOfThePlayPeriod?: string;
  appliedMitigationMeasures?: string;
  riskMaterialised?: string;
  stateOfThePlayComments?: string;
  actions?: string;
};

function toRiskData(input: ProjectRiskInput) {
  const workPackage = input.workPackage?.trim() ?? "";
  if (!workPackage) {
    throw new Error("Work package is required");
  }

  return {
    description: input.description?.trim() ?? "",
    workPackage,
    riskMitigationMeasures: input.riskMitigationMeasures?.trim() ?? "",
    stateOfThePlayPeriod: input.stateOfThePlayPeriod?.trim() ?? "",
    appliedMitigationMeasures: toPrismaYesNo(
      parseYesNo(input.appliedMitigationMeasures)
    ),
    riskMaterialised: toPrismaMaterialised(
      parseRiskMaterialised(input.riskMaterialised)
    ),
    stateOfThePlayComments: input.stateOfThePlayComments?.trim() ?? "",
    actions: input.actions?.trim() ?? "",
  };
}

export async function listProjectRisks(): Promise<ProjectRisk[]> {
  const rows = await prisma.projectRisk.findMany({
    orderBy: [{ workPackage: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapProjectRisk);
}

export async function createProjectRisk(
  input: ProjectRiskInput
): Promise<ProjectRisk> {
  const data = toRiskData(input);
  const row = await prisma.projectRisk.create({
    data: {
      ...data,
      // Prisma client types may lag until regenerate; cast enum values.
      appliedMitigationMeasures: data.appliedMitigationMeasures as never,
      riskMaterialised: data.riskMaterialised as never,
    },
  });
  return mapProjectRisk(row);
}

/**
 * Persist the full risks list: update existing, create new, delete removed.
 */
export async function saveProjectRisks(
  inputs: ProjectRiskInput[]
): Promise<ProjectRisk[]> {
  if (!Array.isArray(inputs)) {
    throw new Error("Risks payload must be an array");
  }

  const normalized = inputs.map((input, index) => {
    const risk = normalizeProjectRisk(input);
    if (!risk) {
      throw new Error(`Risk ${index + 1}: Work package is required`);
    }
    return risk;
  });

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.projectRisk.findMany({ select: { id: true } });
      const existingIds = new Set(existing.map((row) => row.id));
      const incomingIds = new Set(normalized.map((risk) => risk.id));

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.projectRisk.deleteMany({ where: { id: { in: toDelete } } });
      }

      const toUpdate = normalized.filter((risk) => existingIds.has(risk.id));
      const toCreate = normalized.filter((risk) => !existingIds.has(risk.id));

      for (const risk of toUpdate) {
        await tx.projectRisk.update({
          where: { id: risk.id },
          data: {
            description: risk.description,
            workPackage: risk.workPackage,
            riskMitigationMeasures: risk.riskMitigationMeasures,
            stateOfThePlayPeriod: risk.stateOfThePlayPeriod,
            appliedMitigationMeasures: toPrismaYesNo(
              risk.appliedMitigationMeasures
            ) as never,
            riskMaterialised: toPrismaMaterialised(
              risk.riskMaterialised
            ) as never,
            stateOfThePlayComments: risk.stateOfThePlayComments,
            actions: risk.actions,
          },
        });
      }

      if (toCreate.length > 0) {
        await tx.projectRisk.createMany({
          data: toCreate.map((risk) => ({
            id: risk.id,
            description: risk.description,
            workPackage: risk.workPackage,
            riskMitigationMeasures: risk.riskMitigationMeasures,
            stateOfThePlayPeriod: risk.stateOfThePlayPeriod,
            appliedMitigationMeasures: toPrismaYesNo(
              risk.appliedMitigationMeasures
            ) as never,
            riskMaterialised: toPrismaMaterialised(
              risk.riskMaterialised
            ) as never,
            stateOfThePlayComments: risk.stateOfThePlayComments,
            actions: risk.actions,
          })),
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  return listProjectRisks();
}
