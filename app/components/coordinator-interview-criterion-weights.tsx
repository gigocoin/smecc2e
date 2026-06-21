"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_INTERVIEW_CRITERIA,
  nextInterviewCriterionId,
  totalInterviewCriteriaWeight,
  type InterviewCriterion,
} from "@/lib/interview-criterion-weights";

const weightInputClass =
  "w-20 rounded border border-slate-400 bg-white px-2 py-1 text-center text-sm font-bold text-black outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763] disabled:opacity-50";

const labelInputClass =
  "w-full rounded border border-slate-400 bg-white px-2 py-1.5 text-xs font-semibold text-black outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763] disabled:opacity-50";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export function CoordinatorInterviewCriterionWeights({
  readOnly = false,
}: {
  readOnly?: boolean;
} = {}) {
  const [criteria, setCriteria] = useState<InterviewCriterion[]>(
    DEFAULT_INTERVIEW_CRITERIA
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadCriteria = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/interview-rubric", { cache: "no-store" });
      const data = (await res.json()) as {
        criteria?: InterviewCriterion[];
        error?: string;
      };
      if (!res.ok || !data.criteria) {
        setLoadError(data.error ?? "Could not load interview rubric.");
        return;
      }
      setCriteria(data.criteria);
      setSaveSuccess(null);
    } catch {
      setLoadError("Could not load interview rubric.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCriteria();
  }, [loadCriteria]);

  const updateCriterion = (
    id: string,
    field: "label" | "weight",
    value: string
  ) => {
    setCriteria((prev) =>
      prev.map((criterion) => {
        if (criterion.id !== id) return criterion;
        if (field === "label") {
          return { ...criterion, label: value };
        }
        const weight = Number.parseFloat(value);
        return {
          ...criterion,
          weight: Number.isFinite(weight) ? Math.max(0, weight) : 0,
        };
      })
    );
    setSaveSuccess(null);
  };

  const addCriterionRow = () => {
    setCriteria((prev) => [
      ...prev,
      {
        id: nextInterviewCriterionId(prev),
        label: "",
        weight: 0,
      },
    ]);
    setSaveSuccess(null);
  };

  const removeCriterionRow = (criterionId: string) => {
    setCriteria((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((criterion) => criterion.id !== criterionId);
    });
    setSaveSuccess(null);
  };

  const totalWeight = totalInterviewCriteriaWeight(criteria);

  const handleSave = async () => {
    const missingLabel = criteria.find((criterion) => !criterion.label.trim());
    if (missingLabel) {
      setSaveError(
        `Criterion ${missingLabel.id} needs a description before saving.`
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await fetch("/api/interview-rubric", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ criteria }),
      });
      const data = (await res.json()) as {
        criteria?: InterviewCriterion[];
        error?: string;
      };
      if (!res.ok || !data.criteria) {
        setSaveError(data.error ?? "Could not save interview rubric.");
        return;
      }
      setCriteria(data.criteria);
      setSaveSuccess("Interview criterion weights saved.");
    } catch {
      setSaveError("Could not save interview rubric.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Interview criterion weights
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Configure weighted interview criteria used in the interview scoring
            sheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadCriteria()}
            disabled={loading || saving}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            Refresh
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save weights"}
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

        {loading ? (
          <p className="text-sm font-medium text-slate-600">
            Loading interview rubric…
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#ffff00] text-left text-xs font-bold text-black">
                  <th className="border border-black px-3 py-2">
                    Interview criteria
                  </th>
                  <th className="w-40 border border-black px-2 py-2 text-center">
                    Criterion Weight
                  </th>
                  {!readOnly && (
                    <th className="w-28 border border-black px-2 py-2 text-center">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {criteria.map((criterion) => (
                  <tr key={criterion.id} className="align-top">
                    <td className="border border-black px-3 py-2 text-xs font-semibold text-black">
                      <div className="mb-1 font-bold">{criterion.id}</div>
                      {readOnly ? (
                        <p>{criterion.label}</p>
                      ) : (
                        <textarea
                          rows={2}
                          value={criterion.label}
                          onChange={(e) =>
                            updateCriterion(
                              criterion.id,
                              "label",
                              e.target.value
                            )
                          }
                          placeholder="Enter interview criterion"
                          className={labelInputClass}
                        />
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
                          onChange={(e) =>
                            updateCriterion(
                              criterion.id,
                              "weight",
                              e.target.value
                            )
                          }
                          className={weightInputClass}
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="border border-black px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={criteria.length <= 1}
                          onClick={() => removeCriterionRow(criterion.id)}
                          className={`${actionBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                        >
                          Delete row
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="bg-[#dce6f1] font-bold text-black">
                  <td className="border border-black px-3 py-2 text-xs">
                    Total weight
                  </td>
                  <td className="border border-black px-2 py-2 text-center text-xs">
                    {totalWeight}
                  </td>
                  {!readOnly && <td className="border border-black" />}
                </tr>
              </tbody>
            </table>
            {!readOnly && (
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={addCriterionRow}
                  className={`${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                >
                  Add row
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
