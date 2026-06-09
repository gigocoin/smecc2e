export type EvaluatorEvaluationSubmission = {
  assessorScores: Record<string, number>;
  categoryTotals: Record<string, number>;
  grandTotal: number;
  submittedAt: string;
};

export const EVALUATION_CATEGORY_IDS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
] as const;

export function parseEvaluatorEvaluationSubmission(
  value: unknown
): EvaluatorEvaluationSubmission | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!record.categoryTotals || typeof record.categoryTotals !== "object") {
    return null;
  }

  const grandTotalRaw = record.grandTotal;
  const grandTotal =
    typeof grandTotalRaw === "number"
      ? grandTotalRaw
      : typeof grandTotalRaw === "string"
        ? Number.parseFloat(grandTotalRaw)
        : NaN;
  if (!Number.isFinite(grandTotal)) return null;

  const categoryTotals: Record<string, number> = {};
  for (const [key, raw] of Object.entries(
    record.categoryTotals as Record<string, unknown>
  )) {
    const parsed =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number.parseFloat(raw)
          : NaN;
    if (Number.isFinite(parsed)) {
      categoryTotals[key] = parsed;
    }
  }

  return {
    assessorScores:
      record.assessorScores && typeof record.assessorScores === "object"
        ? (record.assessorScores as Record<string, number>)
        : {},
    categoryTotals,
    grandTotal,
    submittedAt:
      typeof record.submittedAt === "string"
        ? record.submittedAt
        : new Date().toISOString(),
  };
}

export function formatEvaluationScore(
  value: number | undefined | null
): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
