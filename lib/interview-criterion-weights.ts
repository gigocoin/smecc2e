export type InterviewCriterion = {
  id: string;
  label: string;
  weight: number;
};

export const DEFAULT_INTERVIEW_CRITERIA: InterviewCriterion[] = [
  {
    id: "A",
    label: "Communication and clarity of responses",
    weight: 25,
  },
  {
    id: "B",
    label: "Motivation, goals, and programme fit",
    weight: 25,
  },
  {
    id: "C",
    label: "Technical / thematic alignment",
    weight: 25,
  },
  {
    id: "D",
    label: "Overall interview impression",
    weight: 25,
  },
];

const LEGACY_INTERVIEW_CRITERION_IDS: Record<string, string> = {
  "I-1": "A",
  "I-2": "B",
  "I-3": "C",
  "I-4": "D",
};

function migrateInterviewCriterionIds(
  criteria: InterviewCriterion[]
): InterviewCriterion[] {
  return criteria.map((criterion) => ({
    ...criterion,
    id: LEGACY_INTERVIEW_CRITERION_IDS[criterion.id] ?? criterion.id,
  }));
}

/** Next unused letter id (A–Z) for a new interview criterion row. */
export function nextInterviewCriterionId(
  criteria: InterviewCriterion[]
): string {
  const used = new Set(criteria.map((criterion) => criterion.id.trim().toUpperCase()));
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter)) return letter;
  }
  return `C${criteria.length + 1}`;
}

export function totalInterviewCriteriaWeight(
  criteria: InterviewCriterion[] = DEFAULT_INTERVIEW_CRITERIA
): number {
  return criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
}

export function normalizeInterviewCriteria(
  value: unknown
): InterviewCriterion[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_INTERVIEW_CRITERIA;
  }
  const criteria = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const weightRaw = record.weight;
      const weight =
        typeof weightRaw === "number"
          ? weightRaw
          : typeof weightRaw === "string"
            ? Number.parseFloat(weightRaw)
            : NaN;
      if (!id || !label || !Number.isFinite(weight)) return null;
      return { id, label, weight: Math.max(0, weight) };
    })
    .filter((criterion): criterion is InterviewCriterion => criterion !== null);
  return migrateInterviewCriterionIds(
    criteria.length > 0 ? criteria : DEFAULT_INTERVIEW_CRITERIA
  );
}
