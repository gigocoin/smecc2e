import type { ApplicationRecord } from "./application-types";
import {
  EVALUATION_CATEGORY_IDS,
  type EvaluatorEvaluationSubmission,
} from "./evaluator-evaluation-types";

export function isApplicantEvaluatorEvaluated(
  app: ApplicationRecord
): boolean {
  return (
    app.evaluator1ReviewStatus === "evaluated" ||
    app.evaluator2ReviewStatus === "evaluated"
  );
}

function completedEvaluatorEvaluations(
  app: ApplicationRecord
): EvaluatorEvaluationSubmission[] {
  const evaluations: EvaluatorEvaluationSubmission[] = [];
  if (
    app.evaluator1ReviewStatus === "evaluated" &&
    app.evaluator1EvaluationData
  ) {
    evaluations.push(app.evaluator1EvaluationData);
  }
  if (
    app.evaluator2ReviewStatus === "evaluated" &&
    app.evaluator2EvaluationData
  ) {
    evaluations.push(app.evaluator2EvaluationData);
  }
  return evaluations;
}

/** Average category totals and grand total across completed evaluator submissions. */
export function averagedEvaluatorEvaluation(
  app: ApplicationRecord
): EvaluatorEvaluationSubmission | null {
  const evaluations = completedEvaluatorEvaluations(app);
  if (evaluations.length === 0) return null;

  const categoryTotals: Record<string, number> = {};
  for (const categoryId of EVALUATION_CATEGORY_IDS) {
    let sum = 0;
    let count = 0;
    for (const evaluation of evaluations) {
      const value = evaluation.categoryTotals[categoryId];
      if (typeof value === "number" && Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    }
    if (count > 0) {
      categoryTotals[categoryId] = sum / count;
    }
  }

  const grandTotal =
    evaluations.reduce((sum, evaluation) => sum + evaluation.grandTotal, 0) /
    evaluations.length;

  return {
    assessorScores: {},
    categoryTotals,
    grandTotal,
    submittedAt: evaluations
      .map((evaluation) => evaluation.submittedAt)
      .sort()
      .at(-1)!,
  };
}
