"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  COORDINATOR_APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/application-types";
import { hostInstitutions } from "@/lib/programmes";
import { useDashboardPortal } from "./dashboard-portal-provider";
import { StatusBadge } from "./coordinator-shared";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "sky" | "emerald" | "red";
}) {
  const accentBorder: Record<string, string> = {
    amber: "border-t-amber-400",
    sky: "border-t-sky-400",
    emerald: "border-t-emerald-400",
    red: "border-t-red-400",
  };
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm ${
        accent ? `border-t-4 ${accentBorder[accent]}` : ""
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-900">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-[#062763]">{value}</p>
    </div>
  );
}

export function CoordinatorDashboard() {
  const { basePath, portalKey } = useDashboardPortal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHydrated, setIsHydrated] = useState(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [totalProgrammes, setTotalProgrammes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const sectionParam = isHydrated ? searchParams.get("section") : null;

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, usersRes, programsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/users"),
        fetch("/api/programs"),
      ]);
      if (appsRes.ok) {
        const data = (await appsRes.json()) as {
          applications: ApplicationRecord[];
        };
        setApplications(data.applications);
      }
      if (usersRes.ok) {
        const data = (await usersRes.json()) as { users: unknown[] };
        setUserCount(data.users?.length ?? 0);
      } else {
        setUserCount(0);
      }
      if (programsRes.ok) {
        const data = (await programsRes.json()) as {
          universities?: { programs: unknown[] }[];
        };
        const count =
          data.universities?.reduce(
            (sum, u) => sum + (u.programs?.length ?? 0),
            0
          ) ?? 0;
        setTotalProgrammes(count);
      } else {
        setTotalProgrammes(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (sectionParam === "users") {
      router.replace(`${basePath}/users`);
    } else if (sectionParam === "regions") {
      router.replace(`${basePath}/regions`);
    } else if (
      sectionParam === "institutions" ||
      sectionParam === "universities"
    ) {
      router.replace(`${basePath}/institutions`);
    } else if (sectionParam === "applicants") {
      router.replace(`${basePath}/applicants`);
    } else if (sectionParam === "scholars") {
      router.replace(`${basePath}/scholars`);
    } else if (sectionParam === "programs") {
      router.replace(`${basePath}/programs`);
    }
  }, [isHydrated, sectionParam, router, basePath]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const scholarsCount = useMemo(
    () => applications.filter((a) => a.status === "approved").length,
    [applications]
  );

  const stats = useMemo(() => {
    const byStatus = {} as Record<ApplicationStatus, number>;
    for (const app of applications) {
      byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
    }
    return {
      total: applications.length,
      byStatus,
    };
  }, [applications]);

  const dashboardSubtitle =
    portalKey === "evaluator"
      ? "Review assigned scholarship applications"
      : "SMECC2E mobility & scholarship coordination";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">Overview</h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            {dashboardSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="shrink-0 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label={
                    portalKey === "evaluator"
                      ? "Assigned applicants"
                      : "Total applicants"
                  }
                  value={stats.total}
                />
                <StatCard
                  label={
                    portalKey === "evaluator"
                      ? "Assigned scholars"
                      : "Scholars (approved)"
                  }
                  value={stats.byStatus.approved ?? 0}
                  accent="emerald"
                />
                <StatCard
                  label="Under review"
                  value={stats.byStatus.under_review ?? 0}
                  accent="sky"
                />
                <StatCard
                  label="Pending"
                  value={stats.byStatus.pending ?? 0}
                  accent="amber"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-[#062763]">
                    Application pipeline
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {COORDINATOR_APPLICATION_STATUSES.map((status) => {
                      const count = applications.filter(
                        (a) => a.status === status
                      ).length;
                      const pct =
                        stats.total > 0
                          ? Math.round((count / stats.total) * 100)
                          : 0;
                      return (
                        <li key={status}>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-900">
                              {STATUS_LABELS[status]}
                            </span>
                            <span className="font-bold text-[#062763]">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#062763] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#062763]">
                      {portalKey === "evaluator"
                        ? "Recent assigned applicants"
                        : "Recent applicants"}
                    </h2>
                    <Link
                      href={`${basePath}/applicants`}
                      className="text-xs font-bold text-[#062763] hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {applications.slice(0, 5).map((app) => (
                      <li
                        key={app.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {applicantDisplayName(app) || app.id}
                          </p>
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {app.typeOfMobility || "—"}
                          </p>
                        </div>
                        <StatusBadge status={app.status} />
                      </li>
                    ))}
                    {applications.length === 0 && (
                      <li className="py-6 text-center text-sm font-semibold text-slate-900">
                        {portalKey === "evaluator"
                          ? "No applications assigned to you yet."
                          : "No applications yet."}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Link
                  href={`${basePath}/users`}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#062763]/30 hover:shadow-sm"
                >
                  <p className="text-xl font-bold text-[#062763]">
                    {userCount}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Dashboard users
                  </p>
                </Link>
                <Link
                  href={`${basePath}/programs`}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#062763]/30 hover:shadow-sm"
                >
                  <p className="text-xl font-bold text-[#062763]">
                    {hostInstitutions.length}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Partner institutions
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {totalProgrammes} programmes listed
                  </p>
                </Link>
                <Link
                  href={`${basePath}/scholars`}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#062763]/30 hover:shadow-sm"
                >
                  <p className="text-xl font-bold text-emerald-700">
                    {scholarsCount}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Active scholars
                  </p>
                </Link>
              </div>
        </div>
      </main>
    </div>
  );
}
