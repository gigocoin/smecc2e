import {
  DEFAULT_INTERVIEW_CRITERIA,
  normalizeInterviewCriteria,
  type InterviewCriterion,
} from "./interview-criterion-weights";
import { isPrismaConnectionError } from "./prisma-errors";
import { prisma } from "./prisma";

export const INTERVIEW_RUBRIC_SETTING_ID = "default";

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

export function validateInterviewCriteria(
  criteria: InterviewCriterion[]
): InterviewCriterion[] {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error("Interview rubric must include at least one criterion");
  }

  const seenIds = new Set<string>();
  return criteria.map((criterion, index) => {
    const id = criterion.id?.trim();
    if (!id) {
      throw new Error(`Criterion ${index + 1} is missing an id`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Duplicate criterion id: ${id}`);
    }
    seenIds.add(id);

    const label = criterion.label?.trim();
    if (!label) {
      throw new Error(`Criterion ${id} must include a label`);
    }

    return {
      id,
      label,
      weight: normalizeWeight(criterion.weight),
    };
  });
}

function parseStoredCriteria(stored: unknown): InterviewCriterion[] | null {
  const normalized = normalizeInterviewCriteria(stored);
  if (normalized === DEFAULT_INTERVIEW_CRITERIA && stored == null) {
    return null;
  }
  try {
    return validateInterviewCriteria(normalized);
  } catch {
    return null;
  }
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2021" || code === "42P01";
}

async function findStoredCriteria(): Promise<unknown | null> {
  if (prisma.interviewRubricSetting) {
    const row = await prisma.interviewRubricSetting.findUnique({
      where: { id: INTERVIEW_RUBRIC_SETTING_ID },
    });
    return row?.criteria ?? null;
  }

  const rows = await prisma.$queryRaw<Array<{ criteria: unknown }>>`
    SELECT criteria
    FROM interview_rubric_settings
    WHERE id = ${INTERVIEW_RUBRIC_SETTING_ID}
    LIMIT 1
  `;
  return rows[0]?.criteria ?? null;
}

async function upsertStoredCriteria(criteria: InterviewCriterion[]): Promise<void> {
  if (prisma.interviewRubricSetting) {
    await prisma.interviewRubricSetting.upsert({
      where: { id: INTERVIEW_RUBRIC_SETTING_ID },
      create: { id: INTERVIEW_RUBRIC_SETTING_ID, criteria },
      update: { criteria },
    });
    return;
  }

  const payload = JSON.stringify(criteria);
  await prisma.$executeRaw`
    INSERT INTO interview_rubric_settings (id, criteria, updated_at)
    VALUES (${INTERVIEW_RUBRIC_SETTING_ID}, ${payload}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
    SET criteria = ${payload}::jsonb, updated_at = NOW()
  `;
}

async function loadStoredCriteria(): Promise<unknown | null> {
  try {
    return await findStoredCriteria();
  } catch (err) {
    if (isPrismaConnectionError(err) || isMissingTableError(err)) {
      return null;
    }
    throw err;
  }
}

export async function getActiveInterviewCriteria(): Promise<InterviewCriterion[]> {
  const stored = await loadStoredCriteria();
  if (!stored) return DEFAULT_INTERVIEW_CRITERIA;
  return parseStoredCriteria(stored) ?? DEFAULT_INTERVIEW_CRITERIA;
}

export async function saveInterviewCriteria(
  criteria: InterviewCriterion[]
): Promise<InterviewCriterion[]> {
  const normalized = validateInterviewCriteria(criteria);
  await upsertStoredCriteria(normalized);
  return normalized;
}
