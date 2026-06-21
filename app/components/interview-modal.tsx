"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import { applicationDocumentUrl } from "@/lib/application-documents";
import {
  INTERVIEW_RAW_SCORE_MAX,
  applicantHomeInstitution,
  computeTotalInterviewScore,
  computeWeightedInterviewScore,
  formatInterviewScore,
  interviewScoreMaximum,
  mergeInterviewCriterionScores,
  type InterviewEvaluationSubmission,
  type InterviewFormat,
} from "@/lib/interview-scoring-sheet";
import {
  DEFAULT_INTERVIEW_CRITERIA,
  totalInterviewCriteriaWeight,
  type InterviewCriterion,
} from "@/lib/interview-criterion-weights";

const RAW_SCORE_OPTIONS = Array.from(
  { length: INTERVIEW_RAW_SCORE_MAX + 1 },
  (_, score) => score
);

function formatDisplayDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function InfoCell({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-black bg-[#dce6f1] p-2">
      <div className="text-[11px] font-bold text-black">{label}</div>
      {children ?? (
        <div className="mt-1 text-xs font-semibold text-black">{value || "—"}</div>
      )}
    </div>
  );
}

function InterviewScoreSummaryTable({
  criteria,
  criterionScores,
  totalScore,
  submitting,
  loading,
  onCriterionScoreChange,
}: {
  criteria: InterviewCriterion[];
  criterionScores: Record<string, number>;
  totalScore: number;
  submitting: boolean;
  loading?: boolean;
  onCriterionScoreChange: (criterionId: string, score: number) => void;
}) {
  const totalWeight = totalInterviewCriteriaWeight(criteria);
  const scoreMaximum = interviewScoreMaximum(criteria);

  if (loading) {
    return (
      <div className="border border-black bg-white px-4 py-8 text-center text-sm font-medium text-slate-600">
        Loading score summary…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-black bg-white">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr className="bg-[#062763] text-left font-bold text-white">
            <th className="border border-black px-2 py-2">CRITERION</th>
            <th className="w-28 border border-black px-2 py-2 text-center">
              RAW SCORE (/5)
            </th>
            <th className="w-24 border border-black px-2 py-2 text-center">
              WEIGHT (%)
            </th>
            <th className="w-40 border border-black px-2 py-2 text-center">
              WEIGHTED SCORE (Formula)
            </th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion) => {
            const rawScore = criterionScores[criterion.id] ?? 0;
            const weighted = computeWeightedInterviewScore(
              rawScore,
              criterion.weight
            );

            return (
              <tr key={criterion.id}>
                <td className="border border-black bg-[#dce6f1] px-2 py-2 font-semibold text-black">
                  {criterion.id}. {criterion.label}
                </td>
                <td className="border border-black bg-[#ccffcc] px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold text-green-700">
                      {criterion.id}
                    </span>
                    <select
                      value={rawScore}
                      disabled={submitting}
                      onChange={(e) =>
                        onCriterionScoreChange(
                          criterion.id,
                          Number.parseInt(e.target.value, 10)
                        )
                      }
                      aria-label={`Raw score for criterion ${criterion.id}`}
                      className="w-16 rounded border border-slate-400 bg-white px-1 py-1 text-center text-xs font-bold text-black outline-none focus:border-[#062763] disabled:opacity-50"
                    >
                      {RAW_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="border border-black bg-[#dce6f1] px-2 py-2 text-center font-bold text-black">
                  {criterion.weight}%
                </td>
                <td className="border border-black bg-white px-2 py-2 text-center">
                  <span className="font-bold text-red-700">
                    ({criterion.id}/5) × {criterion.weight}
                  </span>
                  <span className="mt-0.5 block font-bold text-black">
                    = {formatInterviewScore(weighted)}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="border border-black bg-[#062763] px-2 py-2 font-bold text-white">
              TOTAL INTERVIEW SCORE
            </td>
            <td className="border border-black bg-[#dce6f1]" />
            <td className="border border-black bg-[#062763] px-2 py-2 text-center font-bold text-white">
              {totalWeight}%
            </td>
            <td className="border border-black bg-[#fcd5b5] px-2 py-2 text-center font-bold text-red-700">
              {formatInterviewScore(totalScore)}/{scoreMaximum}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function InterviewModal({
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
  onSubmit: (submission: InterviewEvaluationSubmission) => Promise<boolean>;
}) {
  const [criteria, setCriteria] = useState<InterviewCriterion[]>(
    DEFAULT_INTERVIEW_CRITERIA
  );
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>(
    {}
  );
  const [interviewFormat, setInterviewFormat] =
    useState<InterviewFormat>("Online");
  const [interviewerSignature, setInterviewerSignature] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !application) return;

    let cancelled = false;

    setCriteriaLoading(true);
    setSubmitError(null);

    void fetch(
      `/api/applications/${encodeURIComponent(application.id)}/interview`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        const data = (await res.json()) as {
          criteria?: InterviewCriterion[];
          evaluation?: InterviewEvaluationSubmission | null;
          error?: string;
        };
        if (cancelled) return;

        if (!res.ok || !data.criteria) {
          setSubmitError(
            data.error ?? "Could not load interview score summary."
          );
          setCriteria(DEFAULT_INTERVIEW_CRITERIA);
          setCriterionScores(
            mergeInterviewCriterionScores(undefined, DEFAULT_INTERVIEW_CRITERIA)
          );
          setInterviewFormat("Online");
          setInterviewerSignature("");
          setInterviewDate(formatDisplayDate(new Date()));
          return;
        }

        const configuredCriteria = data.criteria;
        const existing = data.evaluation ?? null;

        setCriteria(configuredCriteria);
        setCriterionScores(
          mergeInterviewCriterionScores(
            existing?.criterionScores,
            configuredCriteria
          )
        );

        if (existing) {
          setInterviewFormat(existing.interviewFormat);
          setInterviewerSignature(existing.interviewerSignature);
          setInterviewDate(
            existing.interviewDate || formatDisplayDate(new Date())
          );
        } else {
          setInterviewFormat("Online");
          setInterviewerSignature("");
          setInterviewDate(formatDisplayDate(new Date()));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSubmitError("Could not load interview score summary.");
        setCriteria(DEFAULT_INTERVIEW_CRITERIA);
        setCriterionScores(
          mergeInterviewCriterionScores(undefined, DEFAULT_INTERVIEW_CRITERIA)
        );
        setInterviewFormat("Online");
        setInterviewerSignature("");
        setInterviewDate(formatDisplayDate(new Date()));
      })
      .finally(() => {
        if (!cancelled) setCriteriaLoading(false);
      });

    void fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { user?: { name: string } };
        if (data.user?.name) {
          setInterviewerName(data.user.name);
          setInterviewerSignature((current) => current || data.user!.name);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, application?.id]);

  const totalScore = useMemo(
    () => computeTotalInterviewScore(criterionScores, criteria),
    [criterionScores, criteria]
  );

  if (!open || !application) return null;

  const profileUrl = application.profileUploaded
    ? applicationDocumentUrl(application.id, "profile")
    : null;

  const handleCriterionScoreChange = (criterionId: string, score: number) => {
    setCriterionScores((prev) => ({
      ...prev,
      [criterionId]: score,
    }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const submission: InterviewEvaluationSubmission = {
      criterionScores: { ...criterionScores },
      criteria,
      totalScore,
      interviewFormat,
      interviewerSignature: interviewerSignature.trim(),
      interviewDate,
      submittedAt: new Date().toISOString(),
    };
    const ok = await onSubmit(submission);
    if (!ok) {
      setSubmitError("Could not submit interview score. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-modal-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="flex max-h-[96dvh] w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 bg-[#062763] px-5 py-4 text-white">
          <h2 id="interview-modal-title" className="text-base font-bold">
            Applicant Interview
          </h2>
          <p className="mt-1 text-sm font-medium text-white/90">
            {application.id} · {applicantDisplayName(application) || "Applicant"}
          </p>
          <p className="mt-1 text-xs font-medium text-[#f7be2a]">
            Complete the interview scoring sheet below.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <div className="text-center">
                  <p className="text-sm font-bold text-[#062763] sm:text-base">
                    SMECC2E INTRA-AFRICA MOBILITY PROJECT
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Grant Agreement No. 101234492
                  </p>
                  <p className="mt-2 text-sm font-bold text-red-700 sm:text-base">
                    INTERVIEW SCORING SHEET – SCHOLARSHIP SELECTION
                  </p>
                </div>

                <div className="mt-5 border border-black">
                  <div className="grid grid-cols-1 border-b border-black sm:grid-cols-[180px_1fr]">
                    <div className="border-b border-black bg-[#dce6f1] p-3 sm:border-b-0 sm:border-r">
                      <p className="text-xs font-bold text-black">
                        Candidate Profile Picture:
                      </p>
                    </div>
                    <div className="flex min-h-28 items-center justify-center bg-[#dce6f1] p-3">
                      {profileUrl ? (
                        <div className="relative h-24 w-24 overflow-hidden rounded border border-black bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={profileUrl}
                            alt={`Profile photo for ${applicantDisplayName(application)}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <p className="text-xs font-medium italic text-red-700">
                          No profile picture uploaded
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <InfoCell
                      label="Candidate Name:"
                      value={applicantDisplayName(application) || "—"}
                    />
                    <InfoCell
                      label="Application ID / Reference No.:"
                      value={application.id}
                    />
                    <InfoCell
                      label="Scholarship Category:"
                      value={application.typeOfMobility || "—"}
                    />
                    <InfoCell
                      label="Host Institution Applied To:"
                      value={application.preferredHostInstitution || "—"}
                    />
                    <InfoCell
                      label="Interviewer Name:"
                      value={
                        interviewerName || application.interviewerName || "—"
                      }
                    />
                    <InfoCell
                      label="Home Institution:"
                      value={applicantHomeInstitution(application)}
                    />
                    <InfoCell label="Date of Interview:" value={interviewDate} />
                    <InfoCell label="Interview Format (Online / In-person):">
                      <select
                        value={interviewFormat}
                        disabled={submitting}
                        onChange={(e) =>
                          setInterviewFormat(e.target.value as InterviewFormat)
                        }
                        className="mt-1 w-full rounded border border-slate-400 bg-white px-2 py-1 text-xs font-semibold text-black outline-none focus:border-[#062763] disabled:opacity-50"
                      >
                        <option value="Online">Online</option>
                        <option value="In-person">In-person</option>
                      </select>
                    </InfoCell>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#062763]">
                    Score Summary
                  </h3>
                  <InterviewScoreSummaryTable
                    criteria={criteria}
                    criterionScores={criterionScores}
                    totalScore={totalScore}
                    submitting={submitting}
                    loading={criteriaLoading}
                    onCriterionScoreChange={handleCriterionScoreChange}
                  />
                </div>

                <div className="mt-4 rounded border border-amber-300 bg-[#fff3cd] px-3 py-2 text-xs font-medium italic text-amber-950">
                  ⚠️ Reminder: The Interview score (above) contributes 30% of
                  the overall candidate score. The document evaluation score
                  contributes the remaining 70%. The combined score determines
                  final ranking.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-0 border border-black sm:grid-cols-2">
                  <div className="border-b border-black bg-[#dce6f1] p-2 sm:border-b-0 sm:border-r">
                    <label
                      htmlFor="interviewer-signature"
                      className="text-xs font-bold text-black"
                    >
                      Interviewer Full Name:
                    </label>
                    <input
                      id="interviewer-signature"
                      type="text"
                      value={interviewerSignature}
                      disabled={submitting}
                      onChange={(e) => setInterviewerSignature(e.target.value)}
                      className="mt-2 min-h-16 w-full rounded border border-slate-400 bg-white px-2 py-2 text-xs font-semibold text-black outline-none focus:border-[#062763] disabled:opacity-50"
                    />
                  </div>
                  <div className="bg-[#dce6f1] p-2">
                    <label
                      htmlFor="interview-date"
                      className="text-xs font-bold text-black"
                    >
                      Date:
                    </label>
                    <input
                      id="interview-date"
                      type="text"
                      value={interviewDate}
                      disabled={submitting}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="mt-2 min-h-16 w-full rounded border border-slate-400 bg-white px-2 py-2 text-xs font-semibold text-black outline-none focus:border-[#062763] disabled:opacity-50"
                    />
                  </div>
                </div>

                {submitError && (
                  <p
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                    role="alert"
                  >
                    {submitError}
                  </p>
                )}
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
            disabled={submitting}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit interview score"}
          </button>
        </div>
      </div>
    </div>
  );
}
