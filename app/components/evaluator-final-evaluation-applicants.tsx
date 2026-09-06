"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import {
  EVALUATION_CATEGORY_IDS,
  formatEvaluationScore,
} from "@/lib/evaluator-evaluation-types";

export function EvaluatorFinalEvaluationApplicants() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/applications?forEvaluation=true");
      const data = (await res.json()) as {
        applications?: ApplicationRecord[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load assigned applicants.");
        setApplications([]);
        return;
      }
      setApplications(data.applications ?? []);
    } catch {
      setLoadError("Could not load assigned applicants.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const evaluatedApplicants = useMemo(
    () =>
      [...applications]
        .filter((app) => app.myEvaluatorReviewStatus === "evaluated")
        .sort((a, b) =>
          (a.id || "").localeCompare(b.id || "", undefined, { numeric: true })
        ),
    [applications]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Final Score
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Evaluated applicants with criteria A–I scores and total
          </p>
        </div>
        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          className="shrink-0 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
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

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Evaluated applicants ({evaluatedApplicants.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Applicants you have evaluated, regardless of pipeline stage.
              Category scores reflect your submitted evaluation.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-4 py-3">Application No</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Mobility Type</th>
                  {EVALUATION_CATEGORY_IDS.map((categoryId) => (
                    <th key={categoryId} className="px-3 py-3 text-center">
                      Criteria {categoryId}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluatedApplicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + EVALUATION_CATEGORY_IDS.length + 1}
                      className="px-4 py-10 text-center font-semibold text-slate-900"
                    >
                      {loading
                        ? "Loading evaluated applicants…"
                        : "No evaluated applicants yet. Complete evaluations on the Evaluation page."}
                    </td>
                  </tr>
                ) : (
                  evaluatedApplicants.map((app) => {
                    const evaluation = app.myEvaluatorEvaluationData;

                    return (
                      <tr key={app.id} className="hover:bg-[#062763]/5">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {app.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {applicantDisplayName(app) || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {app.typeOfMobility || "—"}
                        </td>
                        {EVALUATION_CATEGORY_IDS.map((categoryId) => (
                          <td
                            key={categoryId}
                            className="px-3 py-3 text-center font-semibold text-slate-900"
                          >
                            {formatEvaluationScore(
                              evaluation?.categoryTotals[categoryId]
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold text-[#062763]">
                          {formatEvaluationScore(evaluation?.grandTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
