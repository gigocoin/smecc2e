"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FINANCE_RECORDS_VIEW_LABELS,
  parseFinanceRecordsView,
  type FinanceRecordsView,
} from "@/lib/finance-coordinator-nav";
import {
  formatEuros,
  formatEuroString,
  formatReportPeriod,
  loadOfficerReports,
  openPdfAttachment,
  reportExpenseTotal,
  saveOfficerReports,
  sortReportsByLatestDate,
  type PreFinancingReportRecord,
} from "@/lib/pre-financing-reports";
import {
  FinanceOfficerPreFinancingReportModal,
  type PreFinancingReportDraft,
} from "./finance-officer-pre-financing-report-modal";

const RECORD_COPY: Record<FinanceRecordsView, string> = {
  first_pre_financing:
    "Submitted first pre-financing reports for this tranche, including expenditure and attachments.",
  second_pre_financing:
    "Submitted second pre-financing reports for this tranche, including expenditure and attachments.",
  third_pre_financing:
    "Submitted third pre-financing reports for this tranche, including expenditure and attachments.",
};

type PreFinancingRecord = {
  id: string;
  partner: string;
  financeOfficerId: string;
  financeOfficerName: string;
  reference: string;
  amount: string;
  currency: string;
  releaseDate: string;
  notes: string;
  createdAt: string;
};

type SessionProfile = {
  id: string;
  name: string;
  institution: string;
};

function toEuroAmount(record: PreFinancingRecord): number {
  const value = Number(record.amount);
  if (!Number.isFinite(value)) return 0;
  return value;
}

function toDraft(report: PreFinancingReportRecord): PreFinancingReportDraft {
  return {
    id: report.id,
    tranche: report.tranche,
    institutionName: report.institutionName,
    financeOfficerName: report.financeOfficerName,
    year: report.year,
    month: report.month,
    financialReportFileName: report.financialReportFileName,
    financialReportFileDataUrl: report.financialReportFileDataUrl,
    ledgerFileName: report.ledgerFileName,
    ledgerFileDataUrl: report.ledgerFileDataUrl,
    supportingDocumentFileName: report.supportingDocumentFileName,
    supportingDocumentFileDataUrl: report.supportingDocumentFileDataUrl,
    contributionToScholarship: report.contributionToScholarship,
    contributionToInstitution: report.contributionToInstitution,
    specialNeeds: report.specialNeeds,
    createdAt: report.createdAt,
  };
}

function toRecord(
  draft: PreFinancingReportDraft,
  officerId: string,
  tranche: FinanceRecordsView
): PreFinancingReportRecord {
  return {
    ...draft,
    tranche,
    financeOfficerId: officerId,
  };
}

const iconBtnClass =
  "inline-flex rounded-lg border-2 p-1.5 transition disabled:opacity-50";

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export function FinanceOfficerFinancialRecords() {
  const searchParams = useSearchParams();
  const activeView = parseFinanceRecordsView(searchParams.get("record"));
  const pageTitle = FINANCE_RECORDS_VIEW_LABELS[activeView];

  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(
    null
  );
  const [records, setRecords] = useState<PreFinancingRecord[]>([]);
  const [reports, setReports] = useState<PreFinancingReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingReport, setEditingReport] =
    useState<PreFinancingReportRecord | null>(null);
  const [deletingReport, setDeletingReport] =
    useState<PreFinancingReportRecord | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tableBusy = savingReport || deleting;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setSessionProfile(null);
          return;
        }
        const data = (await res.json()) as {
          user?: { id?: string; name?: string; institution?: string };
        };
        if (!cancelled) {
          setSessionProfile(
            data.user?.id
              ? {
                  id: data.user.id,
                  name: data.user.name ?? "",
                  institution: data.user.institution ?? "",
                }
              : null
          );
        }
      } catch {
        if (!cancelled) setSessionProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/pre-financings?tranche=${encodeURIComponent(activeView)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as {
          records?: PreFinancingRecord[];
        };
        if (!cancelled) {
          setRecords(res.ok ? (data.records ?? []) : []);
        }
      } catch {
        if (!cancelled) setRecords([]);
      }
    })();
    setReports(
      sessionProfile?.id
        ? loadOfficerReports(activeView, sessionProfile.id)
        : []
    );
    setReportOpen(false);
    setEditingReport(null);
    setDeletingReport(null);
    setDeleteError(null);
    setExpandedId(null);
    return () => {
      cancelled = true;
    };
  }, [activeView, sessionProfile?.id]);

  const assignedRecords = useMemo(() => {
    const filtered = sessionProfile
      ? records.filter(
          (record) => record.financeOfficerId === sessionProfile.id
        )
      : [];
    return filtered;
  }, [records, sessionProfile]);

  const sortedReports = useMemo(
    () => sortReportsByLatestDate(reports),
    [reports]
  );

  const stats = useMemo(() => {
    const preFinancing = assignedRecords.reduce(
      (sum, record) => sum + toEuroAmount(record),
      0
    );
    const totalExpenses = reports.reduce(
      (sum, report) => sum + reportExpenseTotal(report),
      0
    );
    const balance = preFinancing - totalExpenses;
    return { preFinancing, totalExpenses, balance };
  }, [assignedRecords, reports]);

  const openCreateReport = () => {
    setEditingReport(null);
    setDeletingReport(null);
    setReportOpen(true);
  };

  const openEditReport = (report: PreFinancingReportRecord) => {
    setDeletingReport(null);
    setEditingReport(report);
    setReportOpen(true);
  };

  const closeReportModal = () => {
    if (savingReport) return;
    setReportOpen(false);
    setEditingReport(null);
  };

  const handleSaveReport = (report: PreFinancingReportDraft) => {
    if (!sessionProfile) return;
    setSavingReport(true);
    try {
      const next = toRecord(report, sessionProfile.id, activeView);
      const updated = editingReport
        ? reports.map((item) => (item.id === next.id ? next : item))
        : [next, ...reports];
      saveOfficerReports(activeView, sessionProfile.id, updated);
      setReports(updated);
      setReportOpen(false);
      setEditingReport(null);
    } finally {
      setSavingReport(false);
    }
  };

  const handleDeleteReport = () => {
    if (!sessionProfile || !deletingReport) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const updated = reports.filter(
        (report) => report.id !== deletingReport.id
      );
      saveOfficerReports(activeView, sessionProfile.id, updated);
      setReports(updated);
      if (expandedId === deletingReport.id) setExpandedId(null);
      setDeletingReport(null);
    } catch {
      setDeleteError("Could not delete this pre-financing report.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Financial Records · Finance Officer workspace
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateReport}
          disabled={loading || !sessionProfile || tableBusy}
          className="shrink-0 rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
        >
          Pre-Financing Report
        </button>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#062763] bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Pre-Financing
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : formatEuros(stats.preFinancing)}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Assigned tranche total (EUR)
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-rose-500 bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Total Expenses
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : formatEuros(stats.totalExpenses)}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Recorded spend for this tranche (EUR)
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Balance
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : formatEuros(stats.balance)}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Pre-financing minus expenses (EUR)
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
            Pre-financing reports
          </p>
          <h2 className="mt-2 text-lg font-bold text-[#062763]">{pageTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            {RECORD_COPY[activeView]}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-700">
            Click a report to expand attachments.
          </p>

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
              Loading pre-financing reports…
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No {pageTitle.toLowerCase()} reports submitted yet.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Use Pre-Financing Report to submit the first report for this
                tranche.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                  <tr>
                    <th className="w-10 px-2 py-3" aria-hidden />
                    <th className="px-3 py-3 sm:px-4">Period</th>
                    <th className="px-3 py-3 sm:px-4">Scholarship</th>
                    <th className="px-3 py-3 sm:px-4">To institution</th>
                    <th className="px-3 py-3 sm:px-4">Special needs</th>
                    <th className="px-3 py-3 sm:px-4">Total</th>
                    <th className="w-24 px-3 py-3 text-right sm:px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedReports.map((report) => {
                    const isExpanded = expandedId === report.id;
                    const attachments = [
                      {
                        label: "Financial report",
                        fileName: report.financialReportFileName,
                        dataUrl: report.financialReportFileDataUrl,
                      },
                      {
                        label: "Ledger",
                        fileName: report.ledgerFileName,
                        dataUrl: report.ledgerFileDataUrl,
                      },
                      {
                        label: "Supporting document",
                        fileName: report.supportingDocumentFileName,
                        dataUrl: report.supportingDocumentFileDataUrl,
                      },
                    ];
                    return (
                      <Fragment key={report.id}>
                        <tr
                          onClick={() =>
                            setExpandedId(isExpanded ? null : report.id)
                          }
                          className={`cursor-pointer transition hover:bg-[#062763]/5 ${
                            isExpanded ? "bg-[#062763]/5" : ""
                          }`}
                        >
                          <td className="px-2 py-3 text-center">
                            <svg
                              className={`mx-auto h-4 w-4 text-[#062763] transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </td>
                          <td className="truncate px-3 py-3 font-medium text-slate-800 sm:px-4">
                            {formatReportPeriod(report)}
                          </td>
                          <td className="truncate px-3 py-3 font-semibold text-[#062763] sm:px-4">
                            {formatEuroString(
                              report.contributionToScholarship
                            )}
                          </td>
                          <td className="truncate px-3 py-3 font-semibold text-[#062763] sm:px-4">
                            {formatEuroString(
                              report.contributionToInstitution
                            )}
                          </td>
                          <td className="truncate px-3 py-3 font-semibold text-[#062763] sm:px-4">
                            {formatEuroString(report.specialNeeds)}
                          </td>
                          <td className="truncate px-3 py-3 font-bold text-[#062763] sm:px-4">
                            {formatEuros(reportExpenseTotal(report))}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <div
                              className="flex justify-end gap-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                title="Edit"
                                aria-label={`Edit report for ${formatReportPeriod(report)}`}
                                onClick={() => openEditReport(report)}
                                disabled={tableBusy}
                                className={`${iconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                aria-label={`Delete report for ${formatReportPeriod(report)}`}
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeletingReport(report);
                                }}
                                disabled={tableBusy}
                                className={`${iconBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50/80">
                            <td colSpan={7} className="p-0">
                              <div
                                className="max-w-full border-t border-slate-200 p-4 sm:p-5"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <p className="text-xs font-bold uppercase tracking-wide text-[#062763]/70">
                                  Attachments
                                </p>
                                <ul className="mt-3 space-y-2">
                                  {attachments.map((attachment) => (
                                    <li
                                      key={attachment.label}
                                      className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                                          {attachment.label}
                                        </p>
                                        <p
                                          className="mt-0.5 truncate text-sm font-semibold text-[#062763]"
                                          title={
                                            attachment.fileName || undefined
                                          }
                                        >
                                          {attachment.fileName || "—"}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={!attachment.dataUrl}
                                        onClick={() => {
                                          if (!attachment.dataUrl) return;
                                          const opened = openPdfAttachment(
                                            attachment.dataUrl,
                                            attachment.fileName ||
                                              "document.pdf"
                                          );
                                          if (!opened) {
                                            window.alert(
                                              "Could not open this PDF. Try uploading the file again."
                                            );
                                          }
                                        }}
                                        className="shrink-0 rounded-lg border-2 border-[#062763]/25 px-3 py-1.5 text-xs font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        View file
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <FinanceOfficerPreFinancingReportModal
        open={reportOpen}
        tranche={activeView}
        trancheLabel={pageTitle}
        sessionProfile={
          sessionProfile
            ? {
                name: sessionProfile.name,
                institution: sessionProfile.institution,
              }
            : null
        }
        initialReport={editingReport ? toDraft(editingReport) : null}
        saving={savingReport}
        onClose={closeReportModal}
        onSave={handleSaveReport}
      />

      {deletingReport ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-pre-financing-report-title"
          onClick={() => {
            if (!deleting) {
              setDeletingReport(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2
                id="delete-pre-financing-report-title"
                className="text-base font-bold text-[#062763]"
              >
                Delete Pre-Financing Report
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-700">
                Delete the report for{" "}
                <strong className="text-slate-900">
                  {formatReportPeriod(deletingReport)}
                </strong>
                ? This cannot be undone.
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              {deleteError ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                  role="alert"
                >
                  {deleteError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!deleting) {
                      setDeletingReport(null);
                      setDeleteError(null);
                    }
                  }}
                  disabled={deleting}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReport}
                  disabled={deleting}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
