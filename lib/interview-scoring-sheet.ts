import {
  DEFAULT_INTERVIEW_CRITERIA,
  type InterviewCriterion,
  normalizeInterviewCriteria,
  totalInterviewCriteriaWeight,
} from "./interview-criterion-weights";

export const INTERVIEW_RAW_SCORE_MAX = 5;

export type InterviewFormat = "Online" | "In-person";

export type InterviewEvaluationSubmission = {
  criterionScores: Record<string, number>;
  criteria: InterviewCriterion[];
  totalScore: number;
  interviewFormat: InterviewFormat;
  interviewerSignature: string;
  interviewDate: string;
  submittedAt: string;
};

export type InterviewScoreSummary = {
  criteria: InterviewCriterion[];
  evaluation: InterviewEvaluationSubmission | null;
  interviewScore: number | null;
  completed: boolean;
};

export function interviewScoreMaximum(
  criteria: InterviewCriterion[] = DEFAULT_INTERVIEW_CRITERIA
): number {
  return totalInterviewCriteriaWeight(criteria);
}

export function emptyInterviewCriterionScores(
  criteria: InterviewCriterion[] = DEFAULT_INTERVIEW_CRITERIA
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const criterion of criteria) {
    scores[criterion.id] = 0;
  }
  return scores;
}

export function mergeInterviewCriterionScores(
  existing: Record<string, number> | undefined,
  criteria: InterviewCriterion[]
): Record<string, number> {
  const scores = emptyInterviewCriterionScores(criteria);
  if (!existing) return scores;
  for (const criterion of criteria) {
    const raw = existing[criterion.id];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      scores[criterion.id] = normalizeInterviewRawScore(raw);
    }
  }
  return scores;
}

export function computeWeightedInterviewScore(
  rawScore: number,
  weight: number
): number {
  if (!Number.isFinite(rawScore)) return 0;
  return (rawScore / INTERVIEW_RAW_SCORE_MAX) * weight;
}

export function computeTotalInterviewScore(
  criterionScores: Record<string, number>,
  criteria: InterviewCriterion[] = DEFAULT_INTERVIEW_CRITERIA
): number {
  let total = 0;
  for (const criterion of criteria) {
    const raw = criterionScores[criterion.id];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      total += computeWeightedInterviewScore(raw, criterion.weight);
    }
  }
  return total;
}

export function normalizeInterviewRawScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(
    INTERVIEW_RAW_SCORE_MAX,
    Math.max(0, Math.round(value * 10) / 10)
  );
}

export function formatInterviewScore(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function parseInterviewEvaluationSubmission(
  value: unknown
): InterviewEvaluationSubmission | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!record.criterionScores || typeof record.criterionScores !== "object") {
    return null;
  }

  const criteria = normalizeInterviewCriteria(record.criteria);
  const criterionScores = mergeInterviewCriterionScores(
    record.criterionScores as Record<string, number>,
    criteria
  );

  const totalScoreRaw = record.totalScore;
  const totalScore =
    typeof totalScoreRaw === "number"
      ? totalScoreRaw
      : typeof totalScoreRaw === "string"
        ? Number.parseFloat(totalScoreRaw)
        : computeTotalInterviewScore(criterionScores, criteria);
  if (!Number.isFinite(totalScore)) return null;

  const interviewFormat =
    record.interviewFormat === "In-person" ? "In-person" : "Online";

  return {
    criterionScores,
    criteria,
    totalScore,
    interviewFormat,
    interviewerSignature:
      typeof record.interviewerSignature === "string"
        ? record.interviewerSignature
        : "",
    interviewDate:
      typeof record.interviewDate === "string" ? record.interviewDate : "",
    submittedAt:
      typeof record.submittedAt === "string"
        ? record.submittedAt
        : new Date().toISOString(),
  };
}

export function applicantHomeInstitution(
  app: {
    masterProgrammeUniversity?: string;
    bachelorProgrammeUniversity?: string;
  }
): string {
  const master = app.masterProgrammeUniversity?.trim();
  if (master) return master;
  const bachelor = app.bachelorProgrammeUniversity?.trim();
  if (bachelor) return bachelor;
  return "—";
}
