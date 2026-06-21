"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import {
  isApplicantAssignedForInterview,
  isApplicantAssignedToInterviewer,
} from "@/lib/coordinator-interview";
import {
  averagedEvaluatorEvaluation,
  isApplicantEvaluatorEvaluated,
} from "@/lib/coordinator-evaluation";
import type { InterviewEvaluationSubmission } from "@/lib/interview-scoring-sheet";
import { formatInterviewScore } from "@/lib/interview-scoring-sheet";
import { formatEvaluationScore } from "@/lib/evaluator-evaluation-types";
import { AssignInterviewerControl } from "@/app/components/assign-interviewer-control";
import { InterviewModal } from "@/app/components/interview-modal";
import { useDashboardPortal } from "./dashboard-portal-provider";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export function InterviewApplicants() {
  const { portalKey } = useDashboardPortal();
  const showAssignInterviewer =
    portalKey === "coordinator" || portalKey === "administrator";
  const filterToCurrentUser = portalKey === "evaluator";

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigningInterviewerId, setAssigningInterviewerId] = useState<
    string | null
  >(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [interviewingApplication, setInterviewingApplication] =
    useState<ApplicationRecord | null>(null);
  const [submittingInterview, setSubmittingInterview] = useState(false);
  const [interviewActionError, setInterviewActionError] = useState<
    string | null
  >(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const applicationsUrl = filterToCurrentUser
        ? "/api/applications?forInterview=true"
        : "/api/applications";
      const requests = [fetch(applicationsUrl)];
      if (filterToCurrentUser) {
        requests.push(fetch("/api/auth/me"));
      }

      const [applicationsRes, meRes] = await Promise.all(requests);
      const applicationsData = (await applicationsRes.json()) as {
        applications?: ApplicationRecord[];
        error?: string;
      };

      if (!applicationsRes.ok) {
        setLoadError(applicationsData.error ?? "Could not load applicants.");
        setApplications([]);
        return;
      }

      if (filterToCurrentUser && meRes) {
        const meData = (await meRes.json()) as {
          user?: { id: string };
          error?: string;
        };
        if (!meRes.ok || !meData.user?.id) {
          setLoadError(meData.error ?? "Could not load your session.");
          setApplications([]);
          return;
        }
        setCurrentUserId(meData.user.id);
      }

      setApplications(applicationsData.applications ?? []);
    } catch {
      setLoadError("Could not load applicants.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [filterToCurrentUser]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const interviewApplicants = useMemo(
    () =>
      [...applications]
        .filter((app) => {
          if (!isApplicantAssignedForInterview(app)) return false;
          if (!isApplicantEvaluatorEvaluated(app)) return false;
          if (filterToCurrentUser && currentUserId) {
            return isApplicantAssignedToInterviewer(app, currentUserId);
          }
          return true;
        })
        .sort((a, b) =>
          (a.id || "").localeCompare(b.id || "", undefined, { numeric: true })
        ),
    [applications, currentUserId, filterToCurrentUser]
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

  const handleSubmitInterview = async (
    submission: InterviewEvaluationSubmission
  ): Promise<boolean> => {
    if (!interviewingApplication) return false;

    setSubmittingInterview(true);
    setInterviewActionError(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(interviewingApplication.id)}/interview`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewScore: submission.totalScore,
            interviewEvaluationData: submission,
          }),
        }
      );
      const data = (await res.json()) as {
        application?: ApplicationRecord;
        error?: string;
      };
      if (!res.ok || !data.application) {
        setInterviewActionError(data.error ?? "Could not submit interview score.");
        return false;
      }
      setApplications((prev) =>
        prev.map((app) =>
          app.id === interviewingApplication.id ? data.application! : app
        )
      );
      setInterviewingApplication(null);
      return true;
    } catch {
      setInterviewActionError("Could not submit interview score.");
      return false;
    } finally {
      setSubmittingInterview(false);
    }
  };

  const tableColSpan = showAssignInterviewer
    ? 7
    : filterToCurrentUser
      ? 5
      : 6;
  const pageSubtitle = filterToCurrentUser
    ? "Evaluated applicants assigned to you for interview"
    : "Applicants assigned to interviewers";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Interview
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            {pageSubtitle}
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

        {assignError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {assignError}
          </p>
        )}

        {interviewActionError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {interviewActionError}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Interview applicants ({interviewApplicants.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              {filterToCurrentUser
                ? "Evaluated applicants where you are the assigned interviewer."
                : "Evaluated applicants with an interviewer assigned, regardless of pipeline stage."}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-4 py-3">Application No</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Mobility Type</th>
                  {!filterToCurrentUser && (
                    <th className="px-4 py-3">Interviewer</th>
                  )}
                  {!filterToCurrentUser && (
                    <th className="px-4 py-3 text-center">Eval Avg Total</th>
                  )}
                  <th className="px-4 py-3 text-center">Interview Score</th>
                  {(showAssignInterviewer || filterToCurrentUser) && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interviewApplicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="px-4 py-10 text-center font-semibold text-slate-900"
                    >
                      {loading
                        ? "Loading interview applicants…"
                        : filterToCurrentUser
                          ? "No evaluated applicants assigned to you for interview."
                          : "No evaluated applicants assigned for interview yet."}
                    </td>
                  </tr>
                ) : (
                  interviewApplicants.map((app) => {
                    const averaged = averagedEvaluatorEvaluation(app);
                    const hasInterviewScore =
                      app.interviewScore != null &&
                      Number.isFinite(app.interviewScore);

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
                        {!filterToCurrentUser && (
                          <td className="px-4 py-3 text-slate-900">
                            <p className="font-semibold">
                              {app.interviewerName ?? app.interviewerId ?? "—"}
                            </p>
                            {app.interviewerEmail && (
                              <p className="text-xs font-semibold text-slate-700">
                                {app.interviewerEmail}
                              </p>
                            )}
                          </td>
                        )}
                        {!filterToCurrentUser && (
                          <td className="px-4 py-3 text-center font-bold text-[#062763]">
                            {formatEvaluationScore(averaged?.grandTotal)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                          {formatInterviewScore(app.interviewScore)}
                        </td>
                        {showAssignInterviewer && (
                          <td className="px-4 py-3">
                            <AssignInterviewerControl
                              application={app}
                              assigning={assigningInterviewerId === app.id}
                              onAssign={handleAssignInterviewer}
                            />
                          </td>
                        )}
                        {filterToCurrentUser && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={submittingInterview}
                              onClick={() => {
                                setInterviewActionError(null);
                                setInterviewingApplication(app);
                              }}
                              className={`${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                            >
                              {hasInterviewScore
                                ? "Review interview"
                                : "Start Interview"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <InterviewModal
        application={interviewingApplication}
        open={interviewingApplication !== null}
        submitting={submittingInterview}
        onClose={() => {
          if (!submittingInterview) setInterviewingApplication(null);
        }}
        onSubmit={handleSubmitInterview}
      />
    </div>
  );
}
