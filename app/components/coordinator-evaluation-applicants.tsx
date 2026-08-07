"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import { downloadEvaluationExcel } from "@/lib/application-export";
import {
  averagedEvaluatorEvaluation,
  isApplicantEvaluatorEvaluated,
} from "@/lib/coordinator-evaluation";
import { formatInterviewScore } from "@/lib/interview-scoring-sheet";
import { formatEvaluationScore } from "@/lib/evaluator-evaluation-types";
import { AssignInterviewerControl } from "@/app/components/assign-interviewer-control";

const EVALUATION_WEIGHT = 0.7;
const INTERVIEW_WEIGHT = 0.3;

function weightedEvaluationAverage(
  averageGrandTotal: number | undefined
): number | null {
  if (averageGrandTotal === undefined || !Number.isFinite(averageGrandTotal)) {
    return null;
  }
  return averageGrandTotal * EVALUATION_WEIGHT;
}

function weightedInterviewScore(
  interviewScore: number | null | undefined
): number | null {
  if (interviewScore === null || interviewScore === undefined) return null;
  if (!Number.isFinite(interviewScore)) return null;
  return interviewScore * INTERVIEW_WEIGHT;
}

export function CoordinatorEvaluationApplicants() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigningInterviewerId, setAssigningInterviewerId] = useState<
    string | null
  >(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/applications");
      const data = (await res.json()) as {
        applications?: ApplicationRecord[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load applicants.");
        setApplications([]);
        return;
      }
      setApplications(data.applications ?? []);
    } catch {
      setLoadError("Could not load applicants.");
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
        .filter(isApplicantEvaluatorEvaluated)
        .sort((a, b) =>
          (a.id || "").localeCompare(b.id || "", undefined, { numeric: true })
        ),
    [applications]
  );

  const handleAssignInterviewer = async (
    id: string,
    interviewerId: string | null
  ): Promise<boolean> => {
    setAssigningInterviewerId(id);
    setAssignError(null);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewerId }),
      });
      const data = (await res.json()) as {
        application?: ApplicationRecord;
        error?: string;
      };
      if (!res.ok || !data.application) {
        setAssignError(data.error ?? "Could not assign interviewer.");
        return false;
      }
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? data.application! : app))
      );
      return true;
    } catch {
      setAssignError("Could not assign interviewer.");
      return false;
    } finally {
      setAssigningInterviewerId(null);
    }
  };

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    setLoadError(null);
    try {
      await downloadEvaluationExcel(evaluatedApplicants);
    } catch {
      setLoadError("Could not export Excel file.");
    } finally {
      setExporting(false);
    }
  }, [evaluatedApplicants]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Evaluation
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Applicants with completed evaluator scorecards
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleExportExcel()}
            disabled={loading || exporting || evaluatedApplicants.length === 0}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={loadApplications}
            disabled={loading}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
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

        {assignError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {assignError}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Evaluated applicants ({evaluatedApplicants.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              All applicants with at least one completed evaluator scorecard.
              Evaluation average is weighted at 70%; interview score at 30%.
              Assign an administrator as interviewer when ready.
            </p>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-4 py-3">Application No</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Mobility Type</th>
                  <th className="px-4 py-3 text-center">
                    Evaluator 1 Score (100%)
                  </th>
                  <th className="px-4 py-3 text-center">
                    Evaluator 2 Score (100%)
                  </th>
                  <th className="px-4 py-3 text-center">
                    Evaluation Ave Score × 0.70
                  </th>
                  <th className="px-4 py-3 text-center">
                    Interview Score (30%)
                  </th>
                  <th className="px-4 py-3 text-right">Assign Interviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluatedApplicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center font-semibold text-slate-900"
                    >
                      {loading
                        ? "Loading evaluated applicants…"
                        : "No evaluated applicants yet."}
                    </td>
                  </tr>
                ) : (
                  evaluatedApplicants.map((app) => {
                    const averaged = averagedEvaluatorEvaluation(app);
                    const evalWeighted = weightedEvaluationAverage(
                      averaged?.grandTotal
                    );
                    const interviewWeighted = weightedInterviewScore(
                      app.interviewScore
                    );

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
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                          {app.evaluator1ReviewStatus === "evaluated"
                            ? formatEvaluationScore(
                                app.evaluator1EvaluationData?.grandTotal
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                          {app.evaluator2ReviewStatus === "evaluated"
                            ? formatEvaluationScore(
                                app.evaluator2EvaluationData?.grandTotal
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-[#062763]">
                          {formatEvaluationScore(evalWeighted)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                          {formatInterviewScore(interviewWeighted)}
                        </td>
                        <td className="px-4 py-3">
                          <AssignInterviewerControl
                            application={app}
                            assigning={assigningInterviewerId === app.id}
                            onAssign={handleAssignInterviewer}
                            allowedRoles={["Administrator"]}
                          />
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
