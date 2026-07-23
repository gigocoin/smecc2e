"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
  type EvaluatorReviewAction,
  type EvaluatorReviewStatus,
} from "@/lib/application-types";
import { EvaluatorEvaluationModal } from "@/app/components/evaluator-evaluation-modal";
import type { EvaluatorEvaluationSubmission } from "@/lib/evaluator-evaluation-types";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

function reviewStatusLabel(status: EvaluatorReviewStatus | null | undefined): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "evaluated":
      return "Evaluated";
    default:
      return "Pending";
  }
}

export function EvaluatorEvaluationApplicants() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evaluatingApplication, setEvaluatingApplication] =
    useState<ApplicationRecord | null>(null);
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);

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

  const sortedApplicants = useMemo(
    () =>
      [...applications]
        .filter((app) => app.myEvaluatorReviewStatus !== "rejected")
        .sort((a, b) =>
          (a.id || "").localeCompare(b.id || "", undefined, { numeric: true })
        ),
    [applications]
  );

  const handleReviewAction = async (
    applicationId: string,
    action: EvaluatorReviewAction
  ) => {
    setActingOnId(applicationId);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/evaluator-review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = (await res.json()) as {
        application?: ApplicationRecord;
        error?: string;
      };
      if (!res.ok || !data.application) {
        setActionError(data.error ?? "Could not update review.");
        return;
      }
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? data.application! : app
        )
      );
    } catch {
      setActionError("Could not update review.");
    } finally {
      setActingOnId(null);
    }
  };

  const handleSubmitEvaluation = async (
    evaluation: EvaluatorEvaluationSubmission
  ): Promise<boolean> => {
    if (!evaluatingApplication) return false;

    setSubmittingEvaluation(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(evaluatingApplication.id)}/evaluator-review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "evaluate", evaluation }),
        }
      );
      const data = (await res.json()) as {
        application?: ApplicationRecord;
        error?: string;
      };
      if (!res.ok || !data.application) {
        setActionError(data.error ?? "Could not submit evaluation.");
        return false;
      }
      setApplications((prev) =>
        prev.map((app) =>
          app.id === evaluatingApplication.id ? data.application! : app
        )
      );
      setEvaluatingApplication(null);
      return true;
    } catch {
      setActionError("Could not submit evaluation.");
      return false;
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Evaluation
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Review assigned scholarship applications
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
        {actionError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {actionError}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Assigned applicants ({sortedApplicants.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Click Accept to enable evaluation for an applicant.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-4 py-3">Applicant Number</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Mobility Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedApplicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center font-semibold text-slate-900"
                    >
                      {loading
                        ? "Loading assigned applicants…"
                        : "No assigned applicants in evaluation."}
                    </td>
                  </tr>
                ) : (
                  sortedApplicants.map((app) => {
                    const reviewStatus = app.myEvaluatorReviewStatus ?? "pending";
                    const busy = actingOnId === app.id;
                    const isEvaluated = reviewStatus === "evaluated";
                    const isAccepted = reviewStatus === "accepted";
                    const canEvaluate = isAccepted && !isEvaluated;

                    return (
                      <tr key={app.id} className="hover:bg-[#062763]/5">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {app.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {applicantDisplayName(app) || "—"}
                          <p className="mt-0.5 text-xs font-semibold text-slate-600">
                            {reviewStatusLabel(reviewStatus)}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {app.typeOfMobility || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy || isEvaluated}
                              onClick={() =>
                                handleReviewAction(app.id, "accept")
                              }
                              className={`${actionBtnClass} border-emerald-200 text-emerald-800 hover:bg-emerald-50`}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={busy || isEvaluated}
                              onClick={() =>
                                handleReviewAction(app.id, "reject")
                              }
                              className={`${actionBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              disabled={busy || !canEvaluate}
                              onClick={() => setEvaluatingApplication(app)}
                              className={`${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5 disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              Evaluate
                            </button>
                          </div>
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

      <EvaluatorEvaluationModal
        application={evaluatingApplication}
        open={evaluatingApplication !== null}
        submitting={submittingEvaluation}
        onClose={() => {
          if (!submittingEvaluation) setEvaluatingApplication(null);
        }}
        onSubmit={handleSubmitEvaluation}
      />
    </div>
  );
}
