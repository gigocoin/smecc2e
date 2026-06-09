"use client";

import { useCallback, useEffect, useState } from "react";
import {
  categoryMaxWeight,
  type EvaluationCategory,
} from "@/lib/evaluator-evaluation-rubric";
import {
  defaultEvaluationRubric,
  nextCriterionId,
} from "@/lib/evaluation-rubric-service";
import {
  isFullRubricMobility,
  MOBILITY_TYPES,
  RUBRIC_TEMPLATE_MOBILITY,
  type MobilityType,
} from "@/lib/mobility-types";

const weightInputClass =
  "w-20 rounded border border-slate-400 bg-white px-2 py-1 text-center text-sm font-bold text-black outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763] disabled:opacity-50";

const labelInputClass =
  "w-full rounded border border-slate-400 bg-white px-2 py-1.5 text-xs font-semibold text-black outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763] disabled:opacity-50";

const selectClass =
  "mt-1 w-full max-w-xl rounded-lg border-2 border-[#062763]/30 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export function CoordinatorCriterionWeights({
  readOnly = false,
}: {
  readOnly?: boolean;
} = {}) {
  const [selectedMobility, setSelectedMobility] = useState<MobilityType>(
    MOBILITY_TYPES[0]
  );
  const [rubric, setRubric] = useState<EvaluationCategory[]>(() =>
    defaultEvaluationRubric()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const hasFullRubric = isFullRubricMobility(selectedMobility);
  const questionsEditable = !readOnly && hasFullRubric;
  const showRowActions = questionsEditable;

  const loadRubric = useCallback(async (mobilityType: MobilityType) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/evaluation-rubric?mobilityType=${encodeURIComponent(mobilityType)}`
      );
      const data = (await res.json()) as {
        rubric?: EvaluationCategory[];
        error?: string;
      };
      if (!res.ok || !data.rubric) {
        setLoadError(data.error ?? "Could not load evaluation rubric.");
        return;
      }
      setRubric(data.rubric);
      setSaveSuccess(null);
    } catch {
      setLoadError("Could not load evaluation rubric.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRubric(selectedMobility);
  }, [loadRubric, selectedMobility]);

  const updateCriterionLabel = (
    categoryId: string,
    criterionId: string,
    label: string
  ) => {
    setRubric((prev) =>
      prev.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,
              criteria: category.criteria.map((criterion) =>
                criterion.id === criterionId
                  ? { ...criterion, label }
                  : criterion
              ),
            }
      )
    );
    setSaveSuccess(null);
  };

  const updateCriterionWeight = (
    categoryId: string,
    criterionId: string,
    raw: string
  ) => {
    const parsed = raw === "" ? 0 : Number.parseFloat(raw);
    const weight = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setRubric((prev) =>
      prev.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,
              criteria: category.criteria.map((criterion) =>
                criterion.id === criterionId
                  ? { ...criterion, weight }
                  : criterion
              ),
            }
      )
    );
    setSaveSuccess(null);
  };

  const addCriterionRow = (categoryId: string) => {
    setRubric((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        const newId = nextCriterionId(categoryId, category.criteria);
        return {
          ...category,
          criteria: [
            ...category.criteria,
            {
              id: newId,
              label: "",
              weight: 0,
            },
          ],
        };
      })
    );
    setSaveSuccess(null);
  };

  const removeCriterionRow = (categoryId: string, criterionId: string) => {
    setRubric((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId || category.criteria.length <= 1) {
          return category;
        }
        return {
          ...category,
          criteria: category.criteria.filter(
            (criterion) => criterion.id !== criterionId
          ),
        };
      })
    );
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await fetch("/api/evaluation-rubric", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobilityType: selectedMobility, rubric }),
      });
      const data = (await res.json()) as {
        rubric?: EvaluationCategory[];
        error?: string;
      };
      if (!res.ok || !data.rubric) {
        setSaveError(data.error ?? "Could not save evaluation rubric.");
        return;
      }
      setRubric(data.rubric);
      setSaveSuccess(
        hasFullRubric
          ? `Evaluation rubric saved for ${selectedMobility}.`
          : `Criterion weights saved for ${selectedMobility}.`
      );
    } catch {
      setSaveError("Could not save evaluation rubric.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Manage Criterion Weight
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            {hasFullRubric
              ? "Edit criterion questions, weights, and rows for categories A through I."
              : `Questions are shared from ${RUBRIC_TEMPLATE_MOBILITY}. Edit weights for this mobility only.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadRubric(selectedMobility)}
            disabled={loading || saving}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : hasFullRubric
                  ? "Save rubric"
                  : "Save weights"}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        {loadError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {loadError}
          </p>
        )}
        {saveError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            {saveSuccess}
          </p>
        )}

        <div className="mb-5 rounded-lg border-2 border-[#062763] bg-white px-4 py-3">
          <label
            htmlFor="criterion-weight-mobility"
            className="block text-sm font-bold text-[#062763]"
          >
            Select mobility
          </label>
          <select
            id="criterion-weight-mobility"
            value={selectedMobility}
            disabled={loading || saving}
            onChange={(e) =>
              setSelectedMobility(e.target.value as MobilityType)
            }
            className={selectClass}
          >
            {MOBILITY_TYPES.map((mobility) => (
              <option key={mobility} value={mobility}>
                {mobility}
              </option>
            ))}
          </select>
          {!hasFullRubric && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              Criteria A–I questions and rows are managed under{" "}
              <span className="font-bold text-[#062763]">
                {RUBRIC_TEMPLATE_MOBILITY}
              </span>
              . Only criterion weights can differ here.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {loading ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-700">
              Loading evaluation rubric…
            </p>
          ) : (
            rubric.map((category) => {
              const maxWeight = categoryMaxWeight(category);
              return (
                <div
                  key={category.id}
                  className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
                >
                  <table className="w-full min-w-[860px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#ffff00] text-left text-xs font-bold text-black">
                        <th className="border border-black px-3 py-2">
                          Criteria {category.id} - {category.title}
                        </th>
                        <th className="w-40 border border-black px-2 py-2 text-center">
                          Criterion Weight
                        </th>
                        {!readOnly && showRowActions && (
                          <th className="w-28 border border-black px-2 py-2 text-center">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {category.criteria.map((criterion) => (
                        <tr key={criterion.id} className="align-top">
                          <td className="border border-black px-3 py-2 text-xs font-semibold text-black">
                            <div className="mb-1 font-bold">{criterion.id}</div>
                            {questionsEditable ? (
                              <textarea
                                rows={3}
                                value={criterion.label}
                                disabled={saving}
                                onChange={(e) =>
                                  updateCriterionLabel(
                                    category.id,
                                    criterion.id,
                                    e.target.value
                                  )
                                }
                                placeholder="Enter criterion question"
                                className={labelInputClass}
                              />
                            ) : (
                              <p>{criterion.label}</p>
                            )}
                          </td>
                          <td className="border border-black bg-[#ccffcc] px-2 py-2 text-center">
                            {readOnly ? (
                              <span className="text-xs font-bold">
                                {criterion.weight}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={criterion.weight}
                                disabled={saving}
                                onChange={(e) =>
                                  updateCriterionWeight(
                                    category.id,
                                    criterion.id,
                                    e.target.value
                                  )
                                }
                                className={weightInputClass}
                              />
                            )}
                          </td>
                          {!readOnly && showRowActions && (
                            <td className="border border-black px-2 py-2 text-center">
                              <button
                                type="button"
                                disabled={
                                  saving || category.criteria.length <= 1
                                }
                                onClick={() =>
                                  removeCriterionRow(category.id, criterion.id)
                                }
                                className={`${actionBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      <tr className="bg-[#dce6f1] font-bold text-black">
                        <td className="border border-black px-3 py-2 text-xs">
                          criterion maximum score
                        </td>
                        <td className="border border-black px-2 py-2 text-center text-xs">
                          {maxWeight}
                        </td>
                        {!readOnly && showRowActions && (
                          <td className="border border-black" />
                        )}
                      </tr>
                    </tbody>
                  </table>
                  {showRowActions && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => addCriterionRow(category.id)}
                        className={`${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                      >
                        Add criterion row
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
