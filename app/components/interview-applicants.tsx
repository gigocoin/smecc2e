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
import { isApplicantEvaluatorEvaluated } from "@/lib/coordinator-evaluation";
import type { InterviewEvaluationSubmission } from "@/lib/interview-scoring-sheet";
import { formatInterviewScore } from "@/lib/interview-scoring-sheet";
import { AssignInterviewerControl } from "@/app/components/assign-interviewer-control";
import { InterviewInvitationModal } from "@/app/components/interview-invitation-modal";
import { InterviewModal } from "@/app/components/interview-modal";
import { useDashboardPortal } from "./dashboard-portal-provider";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export function InterviewApplicants() {
  const { portalKey } = useDashboardPortal();
  const showAssignInterviewer = portalKey === "coordinator";
  const showConductInterview =
    portalKey === "evaluator" || portalKey === "administrator";
  const filterToCurrentUser = portalKey === "evaluator";
  const showResetInterview =
    portalKey === "coordinator" || portalKey === "administrator";
  const showInviteForInterview = portalKey === "administrator";

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigningInterviewerId, setAssigningInterviewerId] = useState<
    string | null
  >(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [resettingInterviewId, setResettingInterviewId] = useState<
    string | null
  >(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [interviewingApplication, setInterviewingApplication] =
    useState<ApplicationRecord | null>(null);
  const [invitingApplication, setInvitingApplication] =
    useState<ApplicationRecord | null>(null);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitationSuccess, setInvitationSuccess] = useState<string | null>(
    null
  );
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
      const needsSessionUser = filterToCurrentUser || showInviteForInterview;
      const requests: Promise<Response>[] = [fetch(applicationsUrl)];
      if (needsSessionUser) {
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

      if (needsSessionUser && meRes) {
        const meData = (await meRes.json()) as {
          user?: { id: string; email?: string };
          error?: string;
        };
        if (!meRes.ok || !meData.user?.id) {
          setLoadError(meData.error ?? "Could not load your session.");
          setApplications([]);
          return;
        }
        setCurrentUserId(meData.user.id);
        setCurrentUserEmail(meData.user.email?.trim() || null);
      }

      setApplications(applicationsData.applications ?? []);
    } catch {
      setLoadError("Could not load applicants.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [filterToCurrentUser, showInviteForInterview]);

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

  const handleResetInterview = async (id: string) => {
    setResettingInterviewId(id);
    setResetError(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(id)}/interview`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reset: true }),
        }
      );
      const data = (await res.json()) as {
        application?: ApplicationRecord;
        error?: string;
      };
      if (!res.ok || !data.application) {
        setResetError(data.error ?? "Could not reset interview.");
        return;
      }
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? data.application! : app))
      );
    } catch {
      setResetError("Could not reset interview.");
    } finally {
      setResettingInterviewId(null);
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

  const handleSendInterviewInvitation = async (details: {
    date: string;
    time: string;
    venue: string;
  }): Promise<boolean> => {
    if (!invitingApplication) return false;
    setSendingInvitation(true);
    setInvitationError(null);
    setInvitationSuccess(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(invitingApplication.id)}/interview-invitation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details),
        }
      );
      const data = (await res.json()) as {
        sent?: boolean;
        email?: string;
        warning?: string | null;
        error?: string;
      };
      if (!res.ok || !data.sent) {
        setInvitationError(
          data.error ?? "Could not send interview invitation."
        );
        return false;
      }
      setInvitingApplication(null);
      setInvitationSuccess(
        data.warning
          ? `Invitation prepared for ${data.email ?? "applicant"} (email delivery not configured).`
          : `Interview invitation sent to ${data.email ?? "applicant"}.`
      );
      return true;
    } catch {
      setInvitationError("Could not send interview invitation.");
      return false;
    } finally {
      setSendingInvitation(false);
    }
  };

  const tableColSpan =
    showAssignInterviewer ||
    showConductInterview ||
    showResetInterview ||
    showInviteForInterview
      ? 6
      : 5;
  const pageSubtitle = filterToCurrentUser
    ? "Evaluated applicants assigned to you for interview"
    : portalKey === "administrator"
      ? "Conduct interviews for evaluated applicants"
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

        {resetError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {resetError}
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

        {invitationError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {invitationError}
          </p>
        )}

        {invitationSuccess && (
          <p
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
            role="status"
          >
            {invitationSuccess}
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
                  <th className="px-4 py-3 text-center">Interview Score</th>
                  {(showAssignInterviewer ||
                    showConductInterview ||
                    showResetInterview ||
                    showInviteForInterview) && (
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
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                          {formatInterviewScore(app.interviewScore)}
                        </td>
                        {(showAssignInterviewer ||
                          showConductInterview ||
                          showResetInterview ||
                          showInviteForInterview) && (
                          <td className="px-4 py-3">
                            <div className="flex flex-nowrap items-center justify-end gap-2">
                              {showInviteForInterview && (
                                <button
                                  type="button"
                                  disabled={
                                    sendingInvitation ||
                                    submittingInterview ||
                                    resettingInterviewId === app.id
                                  }
                                  onClick={() => {
                                    setInvitationError(null);
                                    setInvitationSuccess(null);
                                    setInvitingApplication(app);
                                  }}
                                  className={`${actionBtnClass} whitespace-nowrap border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                                >
                                  Invite for interview
                                </button>
                              )}
                              {showAssignInterviewer && (
                                <AssignInterviewerControl
                                  application={app}
                                  assigning={assigningInterviewerId === app.id}
                                  onAssign={handleAssignInterviewer}
                                  allowedRoles={["Administrator"]}
                                  showAssignedName={false}
                                />
                              )}
                              {showConductInterview &&
                                (portalKey === "administrator" &&
                                hasInterviewScore ? (
                                  <span
                                    className={`${actionBtnClass} whitespace-nowrap border-emerald-300 bg-emerald-50 text-emerald-900`}
                                    aria-label="Interview completed"
                                  >
                                    Interviewed
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={
                                      submittingInterview ||
                                      resettingInterviewId === app.id ||
                                      sendingInvitation
                                    }
                                    onClick={() => {
                                      setInterviewActionError(null);
                                      setInterviewingApplication(app);
                                    }}
                                    className={`${actionBtnClass} whitespace-nowrap border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                                  >
                                    {portalKey === "administrator"
                                      ? "Interview"
                                      : hasInterviewScore
                                        ? "Review interview"
                                        : "Start Interview"}
                                  </button>
                                ))}
                              {showResetInterview && hasInterviewScore && (
                                <button
                                  type="button"
                                  disabled={
                                    resettingInterviewId === app.id ||
                                    assigningInterviewerId === app.id ||
                                    submittingInterview ||
                                    sendingInvitation
                                  }
                                  onClick={() =>
                                    void handleResetInterview(app.id)
                                  }
                                  className={`${actionBtnClass} whitespace-nowrap border-amber-300 text-amber-900 hover:bg-amber-50`}
                                >
                                  {resettingInterviewId === app.id
                                    ? "Resetting…"
                                    : "Reset"}
                                </button>
                              )}
                            </div>
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

      <InterviewInvitationModal
        application={invitingApplication}
        open={invitingApplication !== null}
        sending={sendingInvitation}
        administratorEmail={currentUserEmail}
        onClose={() => {
          if (!sendingInvitation) setInvitingApplication(null);
        }}
        onSend={handleSendInterviewInvitation}
      />
    </div>
  );
}
