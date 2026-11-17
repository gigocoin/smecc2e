"use client";

import { useMemo, useState } from "react";
import { applicationRecordToApplicantSession } from "@/lib/application-to-applicant-session";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
} from "@/lib/application-types";
import type {
  ScholarsManagementSection,
  ScholarsNestedViewId,
} from "@/lib/coordinator-scholars-nav";
import { CoordinatorScholarFormView } from "./coordinator-scholar-form-view";
import { formatDate, StatusBadge } from "./coordinator-shared";

function scholarHost(app: ApplicationRecord): string {
  return app.nomineeHostUniversity || app.preferredHostInstitution || "";
}

function scholarMobility(app: ApplicationRecord): string {
  return app.nomineeMobilityType || app.typeOfMobility || "";
}

function ViewIcon() {
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export function CoordinatorScholarFormRoster({
  scholars,
  loading,
  section,
  viewId,
  viewLabel,
}: {
  scholars: ApplicationRecord[];
  loading: boolean;
  section: ScholarsManagementSection;
  viewId: ScholarsNestedViewId;
  viewLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [mobilityFilter, setMobilityFilter] = useState("all");
  const [viewing, setViewing] = useState<ApplicationRecord | null>(null);

  const mobilityOptions = useMemo(() => {
    const set = new Set(
      scholars.map((app) => scholarMobility(app)).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [scholars]);

  const filtered = useMemo(() => {
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
        scholarHost(app),
        scholarMobility(app),
        app.nomineeAreaOfStudy,
        app.proposedAcademicProgramme,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [scholars, search, mobilityFilter]);

  const viewingSession = viewing
    ? applicationRecordToApplicantSession(viewing)
    : null;

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
        <div className="min-w-48 flex-1">
          <label className="block text-xs font-bold text-slate-800">Search</label>
          <input
            type="search"
            placeholder="Name, email, ID, institution…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800">
            Mobility type
          </label>
          <select
            value={mobilityFilter}
            onChange={(event) => setMobilityFilter(event.target.value)}
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
            Scholars ({filtered.length})
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            Open a scholar to view their {viewLabel} form.
          </p>
        </div>
        <div>
          <table className="w-max min-w-full text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Scholar</th>
                <th className="px-4 py-3">Mobility / Host</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    {loading
                      ? "Loading scholars…"
                      : "No scholars match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-[#062763]/5">
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
                      <p className="text-xs font-semibold text-slate-800">
                        {scholarHost(app) || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatDate(app.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewing(app)}
                        title="View form"
                        aria-label={`View ${viewLabel} for ${applicantDisplayName(app) || app.id}`}
                        className="inline-flex rounded-lg border-2 border-[#062763]/25 p-1.5 text-[#062763] transition hover:bg-[#062763]/5"
                      >
                        <ViewIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && viewingSession ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scholar-form-viewer-title"
          onClick={() => setViewing(null)}
        >
          <div
            className="my-4 w-full max-w-5xl rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#062763]/70">
                  {viewLabel}
                </p>
                <h3
                  id="scholar-form-viewer-title"
                  className="truncate text-base font-bold text-[#062763]"
                >
                  {viewingSession.displayName}
                </h3>
                <p className="text-xs font-semibold text-slate-700">
                  {viewing.id} · {applicantPrimaryEmail(viewing)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="shrink-0 rounded-lg border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <CoordinatorScholarFormView
                section={section}
                viewId={viewId}
                viewLabel={viewLabel}
                user={viewingSession.user}
                displayName={viewingSession.displayName}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
