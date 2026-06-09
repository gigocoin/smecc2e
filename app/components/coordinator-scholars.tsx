"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/application-types";
import {
  parseScholarsManagementSection,
  SCHOLARS_MANAGEMENT_SECTION_LABELS,
} from "@/lib/coordinator-scholars-nav";
import {
  ApplicationDetailPanel,
  formatDate,
} from "./coordinator-shared";
import { useDashboardPortal } from "./dashboard-portal-provider";

export function CoordinatorScholars() {
  const { basePath } = useDashboardPortal();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeSection = parseScholarsManagementSection(sectionParam);
  const pageTitle = SCHOLARS_MANAGEMENT_SECTION_LABELS[activeSection];
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const scholars = useMemo(
    () => applications.filter((a) => a.status === "approved"),
    [applications]
  );

  const filteredScholars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scholars;
    return scholars.filter((app) => {
      const haystack = [
        app.id,
        applicantDisplayName(app),
        applicantPrimaryEmail(app),
        app.preferredHostInstitution,
        app.proposedAcademicProgramme,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [scholars, search]);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
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

  return (
    <div className="flex min-w-0 flex-1 flex-col">
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
          onClick={loadApplications}
          disabled={loading}
          className="shrink-0 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        {activeSection !== "by_category" && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-slate-900">
            {pageTitle} workflows will be available here. Below is the current
            list of approved scholars.
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
        </div>

        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-slate-900">
          Scholars are applicants with{" "}
          <strong className="text-[#062763]">Approved</strong> status. Change
          status on the{" "}
          <Link
            href={`${basePath}/applicants`}
            className="font-bold text-[#062763] underline"
          >
            Applicants
          </Link>{" "}
          page to add or remove scholars.
        </p>

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-3">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="text-base font-bold text-[#062763]">
                Scholars ({filteredScholars.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                  <tr>
                    <th className="px-4 py-3">Scholar</th>
                    <th className="px-4 py-3">Mobility</th>
                    <th className="px-4 py-3">Host / Programme</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScholars.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center font-semibold text-slate-900"
                      >
                        No approved scholars yet.
                      </td>
                    </tr>
                  ) : (
                    filteredScholars.map((app) => (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedId(app.id)}
                        className={`cursor-pointer transition hover:bg-[#062763]/5 ${
                          selectedId === app.id ? "bg-[#062763]/8" : ""
                        }`}
                      >
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
                          {app.typeOfMobility || "—"}
                        </td>
                        <td className="max-w-40 px-4 py-3 font-medium text-slate-900">
                          <p className="truncate">
                            {app.preferredHostInstitution || "—"}
                          </p>
                          {app.proposedAcademicProgramme && (
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {app.proposedAcademicProgramme}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatDate(app.submittedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white xl:col-span-2">
            {!selected ? (
              <div className="flex min-h-64 items-center justify-center p-8 text-center text-sm font-semibold text-slate-900">
                Select a row to view scholar details.
              </div>
            ) : (
              <ApplicationDetailPanel
                selected={selected}
                updatingStatus={updatingStatus}
                onStatusChange={handleStatusChange}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
