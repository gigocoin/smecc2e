"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
} from "@/lib/application-types";
import {
  parseScholarsApprovalView,
  parseScholarsGrievanceView,
  parseScholarsManagementSection,
  parseScholarsMobilityView,
  parseScholarsPaymentView,
  parseScholarsRecordView,
  parseScholarsTaskView,
  SCHOLARS_APPROVAL_VIEW_LABELS,
  SCHOLARS_GRIEVANCE_VIEW_LABELS,
  SCHOLARS_MANAGEMENT_SECTION_LABELS,
  SCHOLARS_MOBILITY_VIEW_LABELS,
  SCHOLARS_PAYMENT_VIEW_LABELS,
  SCHOLARS_RECORD_VIEW_LABELS,
  SCHOLARS_TASK_VIEW_LABELS,
} from "@/lib/coordinator-scholars-nav";
import {
  ApplicationDetailPanel,
  formatDate,
  StatusBadge,
} from "./coordinator-shared";
import { useDashboardPortal } from "./dashboard-portal-provider";

function hasAssignedEvaluators(app: ApplicationRecord): boolean {
  return Boolean(app.evaluator1Id || app.evaluator2Id);
}

function scholarRowBackground(app: ApplicationRecord, isExpanded: boolean): string {
  if (isExpanded) return "bg-[#062763]/8";
  if (hasAssignedEvaluators(app)) return "bg-emerald-50/80";
  return "";
}

function scholarMobility(app: ApplicationRecord): string {
  return app.nomineeMobilityType || app.typeOfMobility || "";
}

export function CoordinatorScholars() {
  const { portalKey } = useDashboardPortal();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeSection = parseScholarsManagementSection(sectionParam);
  const pageTitle =
    activeSection === "mobilities"
      ? SCHOLARS_MOBILITY_VIEW_LABELS[
          parseScholarsMobilityView(searchParams.get("mobility"))
        ]
      : activeSection === "tasks"
        ? SCHOLARS_TASK_VIEW_LABELS[
            parseScholarsTaskView(searchParams.get("task"))
          ]
        : activeSection === "approvals"
          ? SCHOLARS_APPROVAL_VIEW_LABELS[
              parseScholarsApprovalView(searchParams.get("approval"))
            ]
          : activeSection === "grievances"
            ? SCHOLARS_GRIEVANCE_VIEW_LABELS[
                parseScholarsGrievanceView(searchParams.get("grievance"))
              ]
            : activeSection === "payments"
              ? SCHOLARS_PAYMENT_VIEW_LABELS[
                  parseScholarsPaymentView(searchParams.get("payment"))
                ]
              : activeSection === "records"
                ? SCHOLARS_RECORD_VIEW_LABELS[
                    parseScholarsRecordView(searchParams.get("record"))
                  ]
                : SCHOLARS_MANAGEMENT_SECTION_LABELS[activeSection];
  const showCurrentPageColumn = portalKey !== "administrator";
  const tableColSpan = showCurrentPageColumn ? 7 : 6;

  const [scholars, setScholars] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobilityFilter, setMobilityFilter] = useState("all");

  const loadScholars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scholars");
      if (!res.ok) return;
      const data = (await res.json()) as { scholars: ApplicationRecord[] };
      setScholars(data.scholars);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScholars();
  }, [loadScholars]);

  const mobilityOptions = useMemo(() => {
    const set = new Set(scholars.map((app) => scholarMobility(app)).filter(Boolean));
    return Array.from(set).sort();
  }, [scholars]);

  const filteredScholars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scholars.filter((app) => {
      if (mobilityFilter !== "all" && scholarMobility(app) !== mobilityFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        app.id,
        applicantDisplayName(app),
        applicantPrimaryEmail(app),
        app.nationality,
        app.nomineeHostUniversity,
        app.nomineeMobilityType,
        app.nomineeDurationMonths,
        app.nomineeAreaOfStudy,
        app.preferredHostInstitution,
        app.typeOfMobility,
        app.proposedAcademicProgramme,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [scholars, search, mobilityFilter]);

  return (
    <div className="flex h-[95vh] min-w-0 flex-col overflow-auto">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            SMECC2E mobility & scholarship coordination
          </p>
        </div>
        <button
          type="button"
          onClick={loadScholars}
          disabled={loading}
          className="shrink-0 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <main className="min-w-0 bg-slate-50 p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
          <div className="min-w-48 flex-1">
            <label className="block text-xs font-bold text-slate-800">
              Search
            </label>
            <input
              type="search"
              placeholder="Name, email, ID, institution…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800">
              Mobility type
            </label>
            <select
              value={mobilityFilter}
              onChange={(e) => setMobilityFilter(e.target.value)}
              className="mt-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
            >
              <option value="all">All types</option>
              {mobilityOptions.map((mobility) => (
                <option key={mobility} value={mobility}>
                  {mobility}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-max rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Scholars ({filteredScholars.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Click a scholar to expand details. Rows with a green background
              have evaluators assigned.
            </p>
          </div>
          <div>
            <table className="w-max min-w-full text-left text-sm">
              <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="w-10 px-2 py-3" aria-hidden />
                  <th className="px-4 py-3">Scholar</th>
                  <th className="px-4 py-3">Mobility/Duration</th>
                  <th className="px-4 py-3">Host / Programme</th>
                  <th className="px-4 py-3">Status</th>
                  {showCurrentPageColumn && (
                    <th className="px-4 py-3">Current page</th>
                  )}
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScholars.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="px-4 py-10 text-center font-semibold text-slate-900"
                    >
                      {loading
                        ? "Loading scholars…"
                        : "No scholars match your filters."}
                    </td>
                  </tr>
                ) : (
                  filteredScholars.map((app) => {
                    const isExpanded = expandedId === app.id;
                    const rowBg = scholarRowBackground(app, isExpanded);
                    return (
                      <Fragment key={app.id}>
                        <tr
                          onClick={() =>
                            setExpandedId(isExpanded ? null : app.id)
                          }
                          className={`cursor-pointer transition hover:bg-[#062763]/5 ${rowBg}`}
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
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {applicantDisplayName(app) || "—"}
                            </p>
                            <p className="text-xs font-semibold text-slate-800">
                              {app.id}
                            </p>
                            <p className="text-xs font-semibold text-slate-900">
                              {applicantPrimaryEmail(app)}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <p>{scholarMobility(app) || "—"}</p>
                            {app.nomineeDurationMonths ? (
                              <p className="text-xs font-semibold text-slate-900">
                                {/^\d+(\.\d+)?$/.test(app.nomineeDurationMonths)
                                  ? `${app.nomineeDurationMonths} months`
                                  : app.nomineeDurationMonths}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-40 px-4 py-3 font-medium text-slate-900">
                            <p className="truncate">
                              {app.nomineeHostUniversity ||
                                app.preferredHostInstitution ||
                                "—"}
                            </p>
                            {app.nomineeAreaOfStudy ? (
                              <p className="truncate text-xs font-semibold text-slate-900">
                                {app.nomineeAreaOfStudy}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={app.status} />
                          </td>
                          {showCurrentPageColumn && (
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {app.currentPage != null ? app.currentPage : "—"}
                            </td>
                          )}
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatDate(app.submittedAt)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className={`${rowBg || "bg-slate-50/80"}`}>
                            <td colSpan={tableColSpan} className="p-0">
                              <div
                                className="border-t border-slate-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ApplicationDetailPanel
                                  selected={app}
                                  showStatusUpdate={false}
                                  collapsibleSections
                                  embedded
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
