"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  FINANCE_RECORDS_NAV,
  type FinanceRecordsView,
} from "@/lib/finance-coordinator-nav";
import {
  createPdfObjectUrl,
  downloadPdfAttachment,
  formatEuros,
  formatEuroString,
  formatReportPeriod,
  loadAllPreFinancingReports,
  reportExpenseTotal,
  sortReportsByLatestDate,
  trancheLabel,
  type PreFinancingReportRecord,
} from "@/lib/pre-financing-reports";

type TrancheFilter = "all" | FinanceRecordsView;

type PreviewAttachment = {
  label: string;
  fileName: string;
  dataUrl: string;
};

const FILTERS: { id: TrancheFilter; label: string }[] = [
  { id: "all", label: "All tranches" },
  ...FINANCE_RECORDS_NAV.map((item) => ({
    id: item.id as FinanceRecordsView,
    label: item.label,
  })),
];

function PdfPreviewModal({
  attachment,
  onClose,
}: {
  attachment: PreviewAttachment;
  onClose: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = createPdfObjectUrl(attachment.dataUrl);
    if (!url) {
      setError("Could not load this PDF for preview.");
      setObjectUrl(null);
      return;
    }
    setError(null);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [attachment.dataUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="pdf-preview-title"
              className="text-base font-bold text-[#062763]"
            >
              {attachment.label}
            </h2>
            <p
              className="mt-1 truncate text-xs font-semibold text-slate-600"
              title={attachment.fileName}
            >
              {attachment.fileName || "document.pdf"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ok = downloadPdfAttachment(
                  attachment.dataUrl,
                  attachment.fileName || "document.pdf"
                );
                if (!ok) {
                  window.alert("Could not download this PDF.");
                }
              }}
              className="rounded-lg bg-[#062763] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#062763]/90"
            >
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-4">
          {error ? (
            <div className="flex h-[70vh] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center text-sm font-semibold text-slate-700">
              {error}
            </div>
          ) : objectUrl ? (
            <iframe
              title={attachment.fileName || attachment.label}
              src={objectUrl}
              className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <div className="flex h-[70vh] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600">
              Loading preview…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanceCoordinatorFinancialReports() {
  const [reports, setReports] = useState<PreFinancingReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [trancheFilter, setTrancheFilter] = useState<TrancheFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<PreviewAttachment | null>(null);

  useEffect(() => {
    setLoading(true);
    setReports(loadAllPreFinancingReports());
    setLoading(false);
  }, []);

  useEffect(() => {
    setExpandedId(null);
  }, [trancheFilter]);

  const filteredReports = useMemo(() => {
    const scoped =
      trancheFilter === "all"
        ? reports
        : reports.filter((report) => report.tranche === trancheFilter);
    return sortReportsByLatestDate(scoped);
  }, [reports, trancheFilter]);

  const summary = useMemo(() => {
    const officerIds = new Set(
      filteredReports.map((report) => report.financeOfficerId).filter(Boolean)
    );
    const totalExpenses = filteredReports.reduce(
      (sum, report) => sum + reportExpenseTotal(report),
      0
    );
    return {
      reportCount: filteredReports.length,
      officerCount: officerIds.size,
      totalExpenses,
    };
  }, [filteredReports]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Financial Reports
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Pre-financing reports from all finance officers
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#062763] bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Reports
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : summary.reportCount}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Submitted pre-financing reports
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#f7be2a] bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Finance officers
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : summary.officerCount}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Officers with reports in this view
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-rose-500 bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Total expenses
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : formatEuros(summary.totalExpenses)}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Reported expenditure (EUR)
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
                All finance officer reports
              </p>
              <h2 className="mt-2 text-lg font-bold text-[#062763]">
                Pre-financing reports
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
                Review every submitted pre-financing report across institutions
                and finance officers. Click a row to expand attachments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => {
                const active = trancheFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setTrancheFilter(filter.id)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[#062763] bg-[#062763] text-white"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
              Loading financial reports…
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No pre-financing reports yet.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Reports submitted by finance officers will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                  <tr>
                    <th className="w-10 px-2 py-3" aria-hidden />
                    <th className="px-3 py-3 sm:px-4">Institution</th>
                    <th className="px-3 py-3 sm:px-4">Finance officer</th>
                    <th className="px-3 py-3 sm:px-4">Tranche</th>
                    <th className="px-3 py-3 sm:px-4">Period</th>
                    <th className="px-3 py-3 sm:px-4">Scholarship</th>
                    <th className="px-3 py-3 sm:px-4">To institution</th>
                    <th className="px-3 py-3 sm:px-4">Special needs</th>
                    <th className="px-3 py-3 sm:px-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => {
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
                          <td className="truncate px-3 py-3 font-semibold text-slate-900 sm:px-4">
                            {report.institutionName || "—"}
                          </td>
                          <td className="truncate px-3 py-3 font-medium text-slate-800 sm:px-4">
                            {report.financeOfficerName || "—"}
                          </td>
                          <td className="truncate px-3 py-3 font-medium text-slate-800 sm:px-4">
                            {trancheLabel(report.tranche)}
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
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50/80">
                            <td colSpan={9} className="p-0">
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
                                          setPreviewAttachment({
                                            label: attachment.label,
                                            fileName:
                                              attachment.fileName ||
                                              "document.pdf",
                                            dataUrl: attachment.dataUrl,
                                          });
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

      {previewAttachment ? (
        <PdfPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      ) : null}
    </div>
  );
}
