"use client";

import { useEffect, useMemo, useState } from "react";
import { ApplicationDetailPanel } from "@/app/components/coordinator-shared";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import type { EvaluatorEvaluationSubmission } from "@/lib/evaluator-evaluation-types";
import {
  ASSESSOR_SCORE_MAX,
  categoryMaxWeight,
  computeCategoryTotal,
  computeWeightedScore,
  EVALUATOR_EVALUATION_RUBRIC,
  normalizeAssessorScore,
  type EvaluationCategory,
} from "@/lib/evaluator-evaluation-rubric";

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const ASSESSOR_SCORE_OPTIONS = Array.from(
  { length: ASSESSOR_SCORE_MAX + 1 },
  (_, score) => score
);

export function EvaluatorEvaluationModal({
  application,
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  application: ApplicationRecord | null;
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (evaluation: EvaluatorEvaluationSubmission) => Promise<boolean>;
}) {
  const [assessorScores, setAssessorScores] = useState<Record<string, number>>(
    {}
  );
  const [rubric, setRubric] = useState<EvaluationCategory[]>(
    EVALUATOR_EVALUATION_RUBRIC
  );
  const [rubricLoading, setRubricLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !application) return;

    let cancelled = false;
    setRubricLoading(true);
    setSubmitError(null);

    void fetch(
      `/api/evaluation-rubric?mobilityType=${encodeURIComponent(application.typeOfMobility ?? "")}`
    )
      .then(async (res) => {
        const data = (await res.json()) as {
          rubric?: EvaluationCategory[];
          error?: string;
        };
        if (cancelled) return;
        const activeRubric = data.rubric ?? EVALUATOR_EVALUATION_RUBRIC;
        setRubric(activeRubric);
        const initial: Record<string, number> = {};
        for (const category of activeRubric) {
          for (const criterion of category.criteria) {
            initial[criterion.id] = 0;
          }
        }
        setAssessorScores(initial);
      })
      .catch(() => {
        if (cancelled) return;
        setRubric(EVALUATOR_EVALUATION_RUBRIC);
        const initial: Record<string, number> = {};
        for (const category of EVALUATOR_EVALUATION_RUBRIC) {
          for (const criterion of category.criteria) {
            initial[criterion.id] = 0;
          }
        }
        setAssessorScores(initial);
      })
      .finally(() => {
        if (!cancelled) setRubricLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, application?.id, application?.typeOfMobility]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const category of rubric) {
      totals[category.id] = computeCategoryTotal(category, assessorScores);
    }
    return totals;
  }, [assessorScores, rubric]);

  const grandTotal = useMemo(
    () =>
      rubric.reduce(
        (sum, category) =>
          sum + computeCategoryTotal(category, assessorScores),
        0
      ),
    [assessorScores, rubric]
  );

  const rubricMaxTotal = useMemo(
    () => rubric.reduce((sum, category) => sum + categoryMaxWeight(category), 0),
    [rubric]
  );

  if (!open || !application) return null;

  const handleScoreChange = (criterionId: string, raw: string) => {
    const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
    setAssessorScores((prev) => ({
      ...prev,
      [criterionId]: normalizeAssessorScore(Number.isNaN(parsed) ? 0 : parsed),
    }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const missing = rubric.flatMap((category) =>
      category.criteria.filter(
        (criterion) =>
          assessorScores[criterion.id] === undefined ||
          assessorScores[criterion.id] < 0
      )
    );
    if (missing.length > 0) {
      setSubmitError("Enter an assessor score (0–5) for every criterion.");
      return;
    }

    const evaluation: EvaluatorEvaluationSubmission = {
      assessorScores,
      categoryTotals,
      grandTotal,
      submittedAt: new Date().toISOString(),
    };

    const ok = await onSubmit(evaluation);
    if (!ok) {
      setSubmitError("Could not submit evaluation. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluator-evaluation-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="flex max-h-[96dvh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 bg-[#062763] px-5 py-4 text-white">
          <h2 id="evaluator-evaluation-title" className="text-base font-bold">
            Applicant Evaluation Scorecard
          </h2>
          <p className="mt-1 text-sm font-medium text-white/90">
            {application.id} · {applicantDisplayName(application) || "Applicant"}
            {application.typeOfMobility?.trim()
              ? ` · ${application.typeOfMobility.trim()}`
              : ""}
          </p>
          <p className="mt-1 text-xs font-medium text-[#f7be2a]">
            Review applicant details on the left and score each criterion (0–
            {ASSESSOR_SCORE_MAX}) on the right. Weighted score = (Assessor score
            ÷ {ASSESSOR_SCORE_MAX}) × Criterion weight.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-bold text-[#062763]">
                Applicant details
              </h3>
              <p className="text-xs font-medium text-slate-600">
                All application stages from registration through declaration
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <ApplicationDetailPanel
                selected={application}
                showStatusUpdate={false}
                showAssignEvaluator={false}
                collapsibleSections
                embedded
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-bold text-[#062763]">
                Evaluation scorecard
              </h3>
              <p className="text-xs font-medium text-slate-600">
                Categories A through I
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-4">
              {rubricLoading ? (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-700">
                  Loading evaluation scorecard…
                </p>
              ) : (
              <div className="space-y-5">
                {rubric.map((category) => {
                  const maxWeight = categoryMaxWeight(category);
                  const categoryScore = categoryTotals[category.id] ?? 0;

                  return (
                    <div
                      key={category.id}
                      className="overflow-x-auto border border-black bg-white"
                    >
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#ffff00] text-left text-xs font-bold text-black">
                            <th className="border border-black px-3 py-2">
                              Criteria {category.id} - {category.title}
                            </th>
                            <th className="w-24 border border-black px-2 py-2 text-center">
                              Criterion Weight
                            </th>
                            <th className="w-28 border border-black px-2 py-2 text-center">
                              Assessor Score
                            </th>
                            <th className="w-28 border border-black px-2 py-2 text-center">
                              Weighted Score
                            </th>
                            <th className="w-20 border border-black px-2 py-2 text-center">
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.criteria.map((criterion, index) => {
                            const assessorScore =
                              assessorScores[criterion.id] ?? 0;
                            const weighted = computeWeightedScore(
                              assessorScore,
                              criterion.weight
                            );

                            return (
                              <tr key={criterion.id} className="align-top">
                                <td className="border border-black px-3 py-2 text-xs font-semibold text-black">
                                  <span className="font-bold">
                                    {criterion.id}
                                  </span>{" "}
                                  {criterion.label}
                                </td>
                                <td
                                  className={`border border-black px-2 py-2 text-center text-xs font-bold ${
                                    category.id === "A"
                                      ? "bg-[#ccffcc]"
                                      : "bg-white"
                                  }`}
                                >
                                  {criterion.weight}
                                </td>
                                <td className="border border-black bg-[#d9d9d9] px-2 py-2 text-center">
                                  <select
                                    value={assessorScore}
                                    disabled={submitting || rubricLoading}
                                    onChange={(e) =>
                                      handleScoreChange(
                                        criterion.id,
                                        e.target.value
                                      )
                                    }
                                    aria-label={`Assessor score for ${criterion.id}`}
                                    className="w-20 rounded border border-slate-400 bg-white px-2 py-1 text-center text-sm font-bold text-black outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763] disabled:opacity-50"
                                  >
                                    {ASSESSOR_SCORE_OPTIONS.map((score) => (
                                      <option key={score} value={score}>
                                        {score}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="border border-black px-2 py-2 text-center text-xs font-bold text-black">
                                  {formatScore(weighted)}
                                </td>
                                {index === 0 && (
                                  <td
                                    rowSpan={category.criteria.length + 1}
                                    className="border border-black bg-white px-2 py-2 text-center align-middle text-sm font-bold text-black"
                                  >
                                    {formatScore(categoryScore)}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          <tr className="bg-[#dce6f1] font-bold text-black">
                            <td className="border border-black px-3 py-2 text-xs">
                              criterion maximum score
                            </td>
                            <td className="border border-black bg-[#dce6f1] px-2 py-2 text-center text-xs">
                              {maxWeight}
                            </td>
                            <td className="border border-black px-2 py-2" />
                            <td className="border border-black px-2 py-2 text-center text-xs">
                              {formatScore(categoryScore)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
              )}

              {!rubricLoading && (
              <div className="mt-5 rounded-lg border-2 border-[#062763] bg-white px-4 py-3">
                <p className="text-sm font-bold text-[#062763]">
                  Grand total score: {formatScore(grandTotal)} /{" "}
                  {formatScore(rubricMaxTotal)}
                </p>
              </div>
              )}

              {submitError && (
                <p
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                  role="alert"
                >
                  {submitError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || rubricLoading}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit evaluation"}
          </button>
        </div>
      </div>
    </div>
  );
}
