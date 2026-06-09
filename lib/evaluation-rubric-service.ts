import {
  EVALUATOR_EVALUATION_RUBRIC,
  type EvaluationCategory,
  type EvaluationCriterion,
} from "./evaluator-evaluation-rubric";
import {
  MOBILITY_TYPES,
  RUBRIC_TEMPLATE_MOBILITY,
  TRAINEESHIP_MOBILITY,
  isFullRubricMobility,
  resolveMobilityType,
  type MobilityType,
} from "./mobility-types";
import { isPrismaConnectionError } from "./prisma-errors";
import { prisma } from "./prisma";

export type EvaluationRubricWeights = Record<string, number>;

export function defaultEvaluationRubric(): EvaluationCategory[] {
  return EVALUATOR_EVALUATION_RUBRIC.map((category) => ({
    ...category,
    criteria: category.criteria.map((criterion) => ({ ...criterion })),
  }));
}

function isWeightOverrides(value: unknown): value is EvaluationRubricWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (entry) => typeof entry === "number"
  );
}

function applyLegacyWeightOverrides(
  weights: EvaluationRubricWeights
): EvaluationCategory[] {
  return defaultEvaluationRubric().map((category) => ({
    ...category,
    criteria: category.criteria.map((criterion) => ({
      ...criterion,
      weight: weights[criterion.id] ?? criterion.weight,
    })),
  }));
}

function isEvaluationCategoryArray(value: unknown): value is EvaluationCategory[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (category) =>
      category &&
      typeof category === "object" &&
      typeof category.id === "string" &&
      typeof category.title === "string" &&
      Array.isArray(category.criteria)
  );
}

export function rubricCriterionIds(rubric: EvaluationCategory[]): string[] {
  return rubric.flatMap((category) =>
    category.criteria.map((criterion) => criterion.id)
  );
}

export function nextCriterionId(
  categoryId: string,
  criteria: EvaluationCriterion[]
): string {
  const maxIndex = criteria.reduce((max, criterion) => {
    const match = criterion.id.match(
      new RegExp(`^${categoryId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(\\d+)$`)
    );
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);
  return `${categoryId}.${maxIndex + 1}`;
}

function weightFromMasterRubric(
  master: EvaluationCategory[],
  criterionId: string
): number {
  for (const category of master) {
    const match = category.criteria.find(
      (criterion) => criterion.id === criterionId
    );
    if (match) return match.weight;
  }
  return 0;
}

export function mergeMasterRubricWithWeights(
  master: EvaluationCategory[],
  weights: EvaluationRubricWeights
): EvaluationCategory[] {
  return master.map((category) => ({
    ...category,
    criteria: category.criteria.map((criterion) => ({
      ...criterion,
      weight: weights[criterion.id] ?? criterion.weight,
    })),
  }));
}

function extractWeightsFromRubric(
  rubric: EvaluationCategory[]
): EvaluationRubricWeights {
  const weights: EvaluationRubricWeights = {};
  for (const category of rubric) {
    for (const criterion of category.criteria) {
      weights[criterion.id] = criterion.weight;
    }
  }
  return weights;
}

function normalizeWeight(value: unknown): number {
  const weight =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error("Each criterion weight must be 0 or more");
  }
  return weight;
}

export function validateEvaluationRubric(
  rubric: EvaluationCategory[]
): EvaluationCategory[] {
  const defaults = defaultEvaluationRubric();
  if (rubric.length !== defaults.length) {
    throw new Error("Evaluation rubric must include categories A through I");
  }

  const seenIds = new Set<string>();
  const normalized: EvaluationCategory[] = [];

  for (let index = 0; index < defaults.length; index++) {
    const expected = defaults[index];
    const category = rubric[index];

    if (category.id !== expected.id) {
      throw new Error(`Category ${expected.id} is missing or out of order`);
    }

    const title = category.title?.trim() || expected.title;
    if (!Array.isArray(category.criteria) || category.criteria.length === 0) {
      throw new Error(`Category ${category.id} must have at least one criterion`);
    }

    const criteria: EvaluationCriterion[] = category.criteria.map(
      (criterion, criterionIndex) => {
        const id = criterion.id?.trim();
        if (!id) {
          throw new Error(
            `Category ${category.id} criterion ${criterionIndex + 1} is missing an id`
          );
        }
        if (seenIds.has(id)) {
          throw new Error(`Duplicate criterion id: ${id}`);
        }
        seenIds.add(id);

        const label = criterion.label?.trim();
        if (!label) {
          throw new Error(`Criterion ${id} must include a question`);
        }

        return {
          id,
          label,
          weight: normalizeWeight(criterion.weight),
        };
      }
    );

    normalized.push({
      id: category.id,
      title,
      criteria,
    });
  }

  return normalized;
}

function validateWeightsForMaster(
  master: EvaluationCategory[],
  rubric: EvaluationCategory[]
): EvaluationRubricWeights {
  const submitted = extractWeightsFromRubric(rubric);
  const normalized: EvaluationRubricWeights = {};

  for (const criterionId of rubricCriterionIds(master)) {
    normalized[criterionId] = normalizeWeight(
      submitted[criterionId] ?? weightFromMasterRubric(master, criterionId)
    );
  }

  return normalized;
}

function parseStoredFullRubric(stored: unknown): EvaluationCategory[] | null {
  if (!isEvaluationCategoryArray(stored)) return null;
  try {
    return validateEvaluationRubric(stored);
  } catch {
    return null;
  }
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2021" || code === "42P01";
}

async function findStoredRubricPayload(
  mobilityId: string
): Promise<unknown | null> {
  if (prisma.evaluationRubricSetting) {
    const row = await prisma.evaluationRubricSetting.findUnique({
      where: { id: mobilityId },
    });
    return row?.rubric ?? null;
  }

  const rows = await prisma.$queryRaw<Array<{ rubric: unknown }>>`
    SELECT rubric
    FROM evaluation_rubric_settings
    WHERE id = ${mobilityId}
    LIMIT 1
  `;
  return rows[0]?.rubric ?? null;
}

async function upsertStoredPayload(
  mobilityId: string,
  payload: EvaluationCategory[] | EvaluationRubricWeights
): Promise<void> {
  if (prisma.evaluationRubricSetting) {
    await prisma.evaluationRubricSetting.upsert({
      where: { id: mobilityId },
      create: { id: mobilityId, rubric: payload },
      update: { rubric: payload },
    });
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO evaluation_rubric_settings (id, rubric, updated_at)
    VALUES (${mobilityId}, ${payload}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET rubric = ${payload}, updated_at = NOW()
  `;
}

async function loadStoredPayload(mobilityId: string): Promise<unknown | null> {
  try {
    return await findStoredRubricPayload(mobilityId);
  } catch (err) {
    if (isPrismaConnectionError(err) || isMissingTableError(err)) {
      return null;
    }
    throw err;
  }
}

async function getStoredFullRubric(mobilityId: MobilityType): Promise<EvaluationCategory[]> {
  const defaults = defaultEvaluationRubric();
  const payload = await loadStoredPayload(mobilityId);
  if (!payload) return defaults;
  return parseStoredFullRubric(payload) ?? defaults;
}

export async function getMasterEvaluationRubric(): Promise<EvaluationCategory[]> {
  return getStoredFullRubric(RUBRIC_TEMPLATE_MOBILITY);
}

function resolveMobilityWeights(
  master: EvaluationCategory[],
  payload: unknown | null
): EvaluationRubricWeights {
  if (!payload) {
    return extractWeightsFromRubric(master);
  }
  if (isWeightOverrides(payload)) {
    return validateWeightsForMaster(
      master,
      mergeMasterRubricWithWeights(master, payload)
    );
  }
  const legacyFull = parseStoredFullRubric(payload);
  if (legacyFull) {
    return validateWeightsForMaster(master, legacyFull);
  }
  return extractWeightsFromRubric(master);
}

export async function getActiveEvaluationRubric(
  mobilityType: string
): Promise<EvaluationCategory[]> {
  const resolved = resolveMobilityType(mobilityType);
  const master = await getMasterEvaluationRubric();

  if (isFullRubricMobility(resolved)) {
    return getStoredFullRubric(resolved);
  }

  const payload = await loadStoredPayload(resolved);
  const weights = resolveMobilityWeights(master, payload);
  return mergeMasterRubricWithWeights(master, weights);
}

export async function saveEvaluationRubric(
  mobilityType: string,
  rubric: EvaluationCategory[]
): Promise<{ mobilityType: MobilityType; rubric: EvaluationCategory[] }> {
  const resolved = resolveMobilityType(mobilityType);

  if (isFullRubricMobility(resolved)) {
    const normalized = validateEvaluationRubric(rubric);
    await upsertStoredPayload(resolved, normalized);
    return { mobilityType: resolved, rubric: normalized };
  }

  const master = await getMasterEvaluationRubric();
  const weights = validateWeightsForMaster(master, rubric);
  await upsertStoredPayload(resolved, weights);
  return {
    mobilityType: resolved,
    rubric: mergeMasterRubricWithWeights(master, weights),
  };
}

export {
  MOBILITY_TYPES,
  RUBRIC_TEMPLATE_MOBILITY,
  TRAINEESHIP_MOBILITY,
  isFullRubricMobility,
  isRubricTemplateMobility,
  resolveMobilityType,
};
