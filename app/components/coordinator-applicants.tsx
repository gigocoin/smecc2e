"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  isApplicationStatus,
  STATUS_LABELS,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/application-types";
import {
  downloadApplicationsExcel,
  downloadApplicationsPdf,
} from "@/lib/application-export";
import {
  buildApplicantsManagementNav,
  type ApplicantsManagementNavItem,
} from "@/lib/coordinator-applicants-nav";
import { useDashboardPortal } from "./dashboard-portal-provider";
import {
  ApplicationDetailPanel,
  formatDate,
  StatusBadge,
} from "./coordinator-shared";
import { NomineeLetterModal } from "./nominee-letter-modal";
import { ScholarConfirmationModal } from "./scholar-confirmation-modal";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

/** Status options shown in the /applicants header filter. */
const APPLICANTS_STATUS_FILTER_OPTIONS: ApplicationStatus[] = [
  "draft",
  "under_review",
];

function applicantsPageTitle(
  statusFilter: ApplicationStatus | "all",
  managementNav: ApplicantsManagementNavItem[]
): string {
  if (statusFilter === "all") return "Applicants";
  const match = managementNav.find((item) => item.statusFilter === statusFilter);
  return match?.label ?? STATUS_LABELS[statusFilter];
}

function statusFilterFromParam(
  statusFromUrl: string | null | undefined
): ApplicationStatus | "all" {
  return statusFromUrl && isApplicationStatus(statusFromUrl)
    ? statusFromUrl
    : "all";
}

function hasAssignedEvaluators(app: ApplicationRecord): boolean {
  return Boolean(app.evaluator1Id || app.evaluator2Id);
}

function applicantRowBackground(
  app: ApplicationRecord,
  isExpanded: boolean
): string {
  if (isExpanded) return "bg-[#062763]/8";
  if (hasAssignedEvaluators(app)) return "bg-emerald-50/80";
  return "";
}

export function CoordinatorApplicants({
  statusFromUrl = null,
}: {
  statusFromUrl?: string | null;
}) {
  const router = useRouter();
  const { basePath, portalKey } = useDashboardPortal();
  const showAcceptRejectActions = portalKey === "coordinator";
  const showAssignEvaluator = portalKey === "coordinator";
  const canDeleteApplications = portalKey === "coordinator";
  const pageSubtitle =
    portalKey === "evaluator"
      ? "Review assigned scholarship applications"
      : "SMECC2E mobility & scholarship coordination";
  const managementNav = useMemo(
    () => buildApplicantsManagementNav(basePath),
    [basePath]
  );
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    () => statusFilterFromParam(statusFromUrl)
  );
  const showNomineeLetterShare =
    statusFilter === "offered" && portalKey === "coordinator";
  const showNomineeLetterSend =
    statusFilter === "offered" && portalKey === "administrator";
  const showNomineeLetter = showNomineeLetterShare || showNomineeLetterSend;
  const showActionsColumn = canDeleteApplications || showNomineeLetter;
  const showCurrentPageColumn = !(
    portalKey === "administrator" && statusFilter === "offered"
  );
  const tableColSpan =
    (showCurrentPageColumn ? 7 : 6) + (showActionsColumn ? 1 : 0);
  const [mobilityFilter, setMobilityFilter] = useState("all");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [assigningEvaluatorSlot, setAssigningEvaluatorSlot] = useState<
    1 | 2 | null
  >(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingApplication, setDeletingApplication] =
    useState<ApplicationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [migratingApplication, setMigratingApplication] =
    useState<ApplicationRecord | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);
  const [nomineeLetterApplication, setNomineeLetterApplication] =
    useState<ApplicationRecord | null>(null);
  const [nomineeLetterStartEditing, setNomineeLetterStartEditing] =
    useState(false);
  const [nomineeLetterSuccess, setNomineeLetterSuccess] = useState<
    string | null
  >(null);
  const [migrateSuccess, setMigrateSuccess] = useState<string | null>(null);

  const tableBusy =
    assigningEvaluatorSlot !== null || deleting || migrating || updatingStatus;

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) return;
      const data = (await res.json()) as { applications: ApplicationRecord[] };
      setApplications(data.applications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    setStatusFilter(statusFilterFromParam(statusFromUrl));
  }, [statusFromUrl]);

  useEffect(() => {
    if (!downloadMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target as Node)
      ) {
        setDownloadMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDownloadMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [downloadMenuOpen]);

  const pageTitle = applicantsPageTitle(statusFilter, managementNav);

  const mobilityOptions = useMemo(() => {
    const set = new Set(
      applications
        .filter((a) => statusFilter === "all" || a.status === statusFilter)
        .map((a) =>
          statusFilter === "offered"
            ? a.nomineeMobilityType || a.typeOfMobility
            : a.typeOfMobility
        )
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [applications, statusFilter]);

  const filteredApplicants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (mobilityFilter !== "all") {
        const mobility =
          statusFilter === "offered"
            ? app.nomineeMobilityType || app.typeOfMobility
            : app.typeOfMobility;
        if (mobility !== mobilityFilter) return false;
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
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [applications, search, statusFilter, mobilityFilter]);

  const handleStatusFilterChange = (value: string) => {
    if (value === "all") {
      router.push(`${basePath}/applicants`);
      return;
    }
    if (isApplicationStatus(value)) {
      router.push(`${basePath}/applicants?status=${value}`);
    }
  };

  const handleDownload = (format: "excel" | "pdf") => {
    setDownloadMenuOpen(false);
    if (format === "excel") {
      void downloadApplicationsExcel(filteredApplicants);
      return;
    }
    downloadApplicationsPdf(filteredApplicants);
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { application: ApplicationRecord };
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? data.application : a))
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignEvaluator = async (
    id: string,
    slot: 1 | 2,
    evaluatorId: string | null
  ): Promise<boolean> => {
    setAssigningEvaluatorSlot(slot);
    try {
      const body =
        slot === 1 ? { evaluator1Id: evaluatorId } : { evaluator2Id: evaluatorId };
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { application: ApplicationRecord };
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? data.application : a))
      );
      return true;
    } finally {
      setAssigningEvaluatorSlot(null);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingApplication(null);
    setDeleteError(null);
  };

  const handleDeleteApplication = async () => {
    if (!deletingApplication) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (statusFilter === "offered") {
        const res = await fetch(
          `/api/applications/${encodeURIComponent(deletingApplication.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "evaluation" }),
          }
        );
        const data = (await res.json()) as {
          error?: string;
          application?: ApplicationRecord;
        };
        if (!res.ok || !data.application) {
          setDeleteError(data.error ?? "Could not cancel this nomination.");
          return;
        }
        setApplications((prev) =>
          prev.map((a) =>
            a.id === deletingApplication.id ? data.application! : a
          )
        );
        if (expandedId === deletingApplication.id) {
          setExpandedId(null);
        }
        closeDeleteModal();
        return;
      }

      const res = await fetch(
        `/api/applications/${encodeURIComponent(deletingApplication.id)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete application.");
        return;
      }
      setApplications((prev) =>
        prev.filter((a) => a.id !== deletingApplication.id)
      );
      if (expandedId === deletingApplication.id) {
        setExpandedId(null);
      }
      closeDeleteModal();
    } catch {
      setDeleteError(
        statusFilter === "offered"
          ? "Could not cancel this nomination."
          : "Could not delete application."
      );
    } finally {
      setDeleting(false);
    }
  };

  const closeMigrateModal = () => {
    if (migrating) return;
    setMigratingApplication(null);
    setMigrateError(null);
  };

  const handleMigrateToScholar = async () => {
    if (!migratingApplication) return;
    setMigrating(true);
    setMigrateError(null);
    const nomineeName =
      applicantDisplayName(migratingApplication).trim() ||
      migratingApplication.id;
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(migratingApplication.id)}/scholar-confirmation`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        error?: string;
        application?: ApplicationRecord;
        email?: string;
        devMode?: boolean;
      };
      if (!res.ok || !data.application) {
        setMigrateError(
          data.error ?? "Could not send the confirmation email."
        );
        return;
      }
      setApplications((prev) =>
        prev.map((a) =>
          a.id === migratingApplication.id ? data.application! : a
        )
      );
      if (expandedId === migratingApplication.id) {
        setExpandedId(null);
      }
      setMigrateSuccess(
        data.devMode
          ? `${nomineeName} is now a scholar. The confirmation email was not delivered because email sending is not configured.`
          : `Confirmation sent to ${data.email ?? "the nominee"}. ${nomineeName} is now a scholar.`
      );
      setMigratingApplication(null);
      setMigrateError(null);
    } catch {
      setMigrateError("Could not send the confirmation email.");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div
      className={
        statusFilter === "offered"
          ? "flex h-[95vh] min-w-0 flex-col overflow-auto"
          : "flex min-w-0 flex-1 flex-col"
      }
    >
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            {pageSubtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor="applicants-status-filter">
            Filter status
          </label>
          <select
            id="applicants-status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
          >
            <option value="all">All statuses</option>
            {APPLICANTS_STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
            {statusFilter !== "all" &&
            !APPLICANTS_STATUS_FILTER_OPTIONS.includes(statusFilter) ? (
              <option value={statusFilter}>
                {STATUS_LABELS[statusFilter]}
              </option>
            ) : null}
          </select>

          <div ref={downloadMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setDownloadMenuOpen((open) => !open)}
              aria-expanded={downloadMenuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
            >
              Download Applications
              <svg
                className={`h-4 w-4 transition ${downloadMenuOpen ? "rotate-180" : ""}`}
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
            </button>
            {downloadMenuOpen && (
              <div
                role="menu"
                aria-label="Download applications"
                className="absolute right-0 z-40 mt-2 min-w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleDownload("excel")}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
                >
                  Excel
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleDownload("pdf")}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
                >
                  PDF
                </button>
              </div>
            )}
          </div>

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

      <main
        className={
          statusFilter === "offered"
            ? "min-w-0 bg-slate-50 p-4 sm:p-6"
            : "min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-slate-50 p-4 sm:p-6"
        }
      >
        {nomineeLetterSuccess && (
          <p
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
            role="status"
          >
            {nomineeLetterSuccess}
          </p>
        )}
        {migrateSuccess && (
          <p
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
            role="status"
          >
            {migrateSuccess}
          </p>
        )}
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
              {mobilityOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-max rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#062763]">
              Applications ({filteredApplicants.length})
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Click an applicant to expand details. Rows with a green background
              have evaluators assigned.
            </p>
          </div>
          <div>
            <table className="w-max min-w-full text-left text-sm">
              <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="w-10 px-2 py-3" aria-hidden />
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">
                    {statusFilter === "offered" ? "Mobility/Duration" : "Mobility"}
                  </th>
                  <th className="px-4 py-3">Host / Programme</th>
                  <th className="px-4 py-3">Status</th>
                  {showCurrentPageColumn && (
                    <th className="px-4 py-3">Current page</th>
                  )}
                  <th className="px-4 py-3">Submitted</th>
                  {showActionsColumn && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplicants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="px-4 py-10 text-center font-semibold text-slate-900"
                    >
                      {loading
                        ? "Loading applications…"
                        : "No applications match your filters."}
                    </td>
                  </tr>
                ) : (
                  filteredApplicants.map((app) => {
                    const isExpanded = expandedId === app.id;
                    const rowBg = applicantRowBackground(app, isExpanded);
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
                            {statusFilter === "offered" ? (
                              <>
                                <p>
                                  {app.nomineeMobilityType ||
                                    app.typeOfMobility ||
                                    "—"}
                                </p>
                                {app.nomineeDurationMonths ? (
                                  <p className="text-xs font-semibold text-slate-900">
                                    {/^\d+(\.\d+)?$/.test(
                                      app.nomineeDurationMonths
                                    )
                                      ? `${app.nomineeDurationMonths} months`
                                      : app.nomineeDurationMonths}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              app.typeOfMobility || "—"
                            )}
                          </td>
                          <td className="max-w-40 px-4 py-3 font-medium text-slate-900">
                            <p className="truncate">
                              {(statusFilter === "offered"
                                ? app.nomineeHostUniversity
                                : "") ||
                                app.preferredHostInstitution ||
                                "—"}
                            </p>
                            {statusFilter === "offered" ? (
                              app.nomineeAreaOfStudy ? (
                                <p className="truncate text-xs font-semibold text-slate-900">
                                  {app.nomineeAreaOfStudy}
                                </p>
                              ) : null
                            ) : (
                              app.proposedAcademicProgramme && (
                                <p className="truncate text-xs font-semibold text-slate-900">
                                  {app.proposedAcademicProgramme}
                                </p>
                              )
                            )}
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
                          {showActionsColumn && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex flex-nowrap items-center justify-end gap-2">
                                {showNomineeLetter && app.status === "offered" && (
                                  <>
                                    {showNomineeLetterShare &&
                                    app.nomineeLetterShared ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled
                                          className={`${actionBtnClass} shrink-0 border-emerald-200 bg-emerald-50 text-emerald-800 disabled:opacity-100`}
                                        >
                                          Draft Shared
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNomineeLetterStartEditing(true);
                                            setNomineeLetterApplication(app);
                                            setNomineeLetterSuccess(null);
                                          }}
                                          disabled={tableBusy}
                                          className={`${actionBtnClass} shrink-0 border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                                        >
                                          Edit
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNomineeLetterStartEditing(false);
                                          setNomineeLetterApplication(app);
                                          setNomineeLetterSuccess(null);
                                        }}
                                        disabled={tableBusy}
                                        className={`${actionBtnClass} shrink-0 border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                                      >
                                        {showNomineeLetterSend
                                          ? "View letter"
                                          : "Generate Nominee Letter"}
                                      </button>
                                    )}
                                  </>
                                )}
                                {statusFilter === "offered" && canDeleteApplications && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMigratingApplication(app);
                                      setMigrateError(null);
                                    }}
                                    disabled={tableBusy}
                                    className={`${actionBtnClass} shrink-0 border-[#062763] bg-[#062763] text-white hover:bg-[#0a3580]`}
                                  >
                                    Migrate to scholar
                                  </button>
                                )}
                                {canDeleteApplications && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingApplication(app);
                                      setDeleteError(null);
                                    }}
                                    disabled={tableBusy}
                                    className={`${actionBtnClass} shrink-0 ${
                                      statusFilter === "offered"
                                        ? "border-amber-300 text-amber-900 hover:bg-amber-50"
                                        : "border-red-200 text-red-700 hover:bg-red-50"
                                    }`}
                                  >
                                    {statusFilter === "offered"
                                      ? "Cancel"
                                      : "Delete"}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
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
                                  showAcceptRejectActions={
                                    showAcceptRejectActions
                                  }
                                  updatingStatus={updatingStatus}
                                  onStatusChange={
                                    showAcceptRejectActions
                                      ? handleStatusChange
                                      : undefined
                                  }
                                  showAssignEvaluator={showAssignEvaluator}
                                  assigningEvaluatorSlot={assigningEvaluatorSlot}
                                  onAssignEvaluator={
                                    showAssignEvaluator
                                      ? handleAssignEvaluator
                                      : undefined
                                  }
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

      {canDeleteApplications && migratingApplication && (
        <ScholarConfirmationModal
          application={migratingApplication}
          sending={migrating}
          error={migrateError}
          onClose={closeMigrateModal}
          onSend={() => void handleMigrateToScholar()}
        />
      )}

      {canDeleteApplications && deletingApplication && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-application-title"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-application-title"
              className={`text-base font-bold ${
                statusFilter === "offered" ? "text-amber-900" : "text-red-800"
              }`}
            >
              {statusFilter === "offered"
                ? "Cancel nomination"
                : "Delete application"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {statusFilter === "offered" ? (
                <>
                  Return{" "}
                  <strong>
                    {applicantDisplayName(deletingApplication) ||
                      deletingApplication.id}
                  </strong>{" "}
                  ({deletingApplication.id}) to evaluation? They will leave the
                  nominees list.
                </>
              ) : (
                <>
                  Remove the application for{" "}
                  <strong>
                    {applicantDisplayName(deletingApplication) ||
                      deletingApplication.id}
                  </strong>{" "}
                  ({deletingApplication.id})? Uploaded documents will also be
                  removed. This cannot be undone.
                </>
              )}
            </p>
            {deleteError && (
              <p
                className="mt-2 text-sm font-semibold text-red-700"
                role="alert"
              >
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {statusFilter === "offered" ? "Keep nominee" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleDeleteApplication}
                disabled={deleting}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  statusFilter === "offered"
                    ? "bg-amber-700 hover:bg-amber-800"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {statusFilter === "offered"
                  ? deleting
                    ? "Cancelling…"
                    : "Cancel nomination"
                  : deleting
                    ? "Deleting…"
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNomineeLetter && nomineeLetterApplication && (
        <NomineeLetterModal
          applicationId={nomineeLetterApplication.id}
          applicantName={
            [nomineeLetterApplication.firstName, nomineeLetterApplication.surname]
              .map((part) => part?.trim())
              .filter(Boolean)
              .join(" ") || nomineeLetterApplication.id
          }
          mode={showNomineeLetterSend ? "send" : "share"}
          startEditing={nomineeLetterStartEditing}
          onClose={() => {
            setNomineeLetterApplication(null);
            setNomineeLetterStartEditing(false);
          }}
          onDraftShared={(message) => {
            setNomineeLetterSuccess(message);
            setNomineeLetterStartEditing(false);
            void loadApplications();
          }}
          onSent={(message) => {
            setNomineeLetterApplication(null);
            setNomineeLetterStartEditing(false);
            setNomineeLetterSuccess(message);
            void loadApplications();
          }}
        />
      )}
    </div>
  );
}
