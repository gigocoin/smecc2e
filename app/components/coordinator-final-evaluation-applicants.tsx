"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/application-types";
import { downloadFinalEvaluationExcel } from "@/lib/application-export";
import {
  averagedEvaluatorEvaluation,
  isApplicantEvaluatorEvaluated,
} from "@/lib/coordinator-evaluation";
import {
  EVALUATION_CATEGORY_IDS,
  formatEvaluationScore,
} from "@/lib/evaluator-evaluation-types";
import { formatInterviewScore } from "@/lib/interview-scoring-sheet";
import { StatusBadge } from "./coordinator-shared";

const MIGRATE_OPTIONS: {
  value: string;
  label: string;
  status: ApplicationStatus;
}[] = [
  { value: "under_review", label: "Eligibility Checks", status: "under_review" },
  { value: "offered", label: "Offered", status: "offered" },
  { value: "reserved", label: "Reserved", status: "reserved" },
  { value: "approved", label: "Approved", status: "approved" },
];

function migrateSelectValue(status: ApplicationStatus): string {
  const match = MIGRATE_OPTIONS.find((option) => option.status === status);
  return match?.value ?? "";
}

function overallScore(
  evalAvgTotal: number | undefined,
  interviewScore: number | null | undefined
): number | null {
  if (evalAvgTotal === undefined || !Number.isFinite(evalAvgTotal)) return null;
  if (interviewScore === null || interviewScore === undefined) return null;
  if (!Number.isFinite(interviewScore)) return null;
  return Math.round(((evalAvgTotal + interviewScore) / 2) * 10) / 10;
}

function MigrateApplicantSelect({
  application,
  migrating,
  onMigrate,
}: {
  application: ApplicationRecord;
  migrating: boolean;
  onMigrate: (id: string, status: ApplicationStatus) => void;
}) {
  const selectedValue = migrateSelectValue(application.status);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <StatusBadge status={application.status} />
      <label className="sr-only" htmlFor={`migrate-applicant-${application.id}`}>
        Migrate applicant
      </label>
      <select
        id={`migrate-applicant-${application.id}`}
        value={selectedValue}
        disabled={migrating}
        onChange={(e) => {
          const option = MIGRATE_OPTIONS.find(
            (item) => item.value === e.target.value
          );
          if (!option || option.status === application.status) return;
          onMigrate(application.id, option.status);
        }}
        className="max-w-[11.5rem] rounded-lg border-2 border-[#062763]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
      >
        {selectedValue === "" && (
          <option value="" disabled>
            {migrating ? "Migrating…" : "Select…"}
          </option>
        )}
        {MIGRATE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CoordinatorFinalEvaluationApplicants() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [migratingId, setMigratingId] = useState<string | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);
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

  const handleMigrate = useCallback(
    async (id: string, status: ApplicationStatus) => {
      setMigratingId(id);
      setMigrateError(null);
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = (await res.json()) as {
          application?: ApplicationRecord;
          error?: string;
        };
        if (!res.ok || !data.application) {
          setMigrateError(data.error ?? "Could not migrate applicant.");
          return;
        }
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? data.application! : app))
        );
      } catch {
        setMigrateError("Could not migrate applicant.");
      } finally {
        setMigratingId(null);
      }
    },
    []
  );

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    setLoadError(null);
    try {
      await downloadFinalEvaluationExcel(evaluatedApplicants);
    } catch {
      setLoadError("Could not export Excel file.");
    } finally {
      setExporting(false);
    }
  }, [evaluatedApplicants]);

  const columnCount = 3 + EVALUATION_CATEGORY_IDS.length + 4;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Final Evaluation
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Evaluated applicants with averaged criteria scores and interview
            results
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
        {migrateError && (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {migrateError}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Evaluated applicants ({evaluatedApplicants.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Applicants with at least one completed evaluator scorecard,
              regardless of pipeline stage. Criteria A–I and eval total are
              averaged when both evaluators have submitted. Use Migrate
              Applicant to move someone to Eligibility Checks, Offered,
              Reserved, or Approved.
            </p>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1550px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-4 py-3">Application No</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Mobility Type</th>
                  {EVALUATION_CATEGORY_IDS.map((categoryId) => (
                    <th key={categoryId} className="px-3 py-3 text-center">
                      Criteria {categoryId}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">Eval Avg Total</th>
                  <th className="px-4 py-3 text-center">Interview Score</th>
                  <th className="px-4 py-3 text-center">Overall Score</th>
                  <th className="px-4 py-3 text-right">Migrate Applicant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluatedApplicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columnCount}
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
                    const overall = overallScore(
                      averaged?.grandTotal,
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
                        {EVALUATION_CATEGORY_IDS.map((categoryId) => (
                          <td
                            key={categoryId}
                            className="px-3 py-3 text-center font-semibold text-slate-900"
                          >
                            {formatEvaluationScore(
                              averaged?.categoryTotals[categoryId]
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold text-[#062763]">
                          {formatEvaluationScore(averaged?.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                          {formatInterviewScore(app.interviewScore)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-[#062763]">
                          {overall === null ? "—" : overall.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MigrateApplicantSelect
                            application={app}
                            migrating={migratingId === app.id}
                            onMigrate={(id, status) => {
                              void handleMigrate(id, status);
                            }}
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
