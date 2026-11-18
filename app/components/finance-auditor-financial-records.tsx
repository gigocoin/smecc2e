"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FINANCE_RECORDS_VIEW_LABELS,
  parseFinanceRecordsView,
  type FinanceRecordsView,
} from "@/lib/finance-coordinator-nav";
import {
  formatReleasedEuros,
  loadPreFinancingReleases,
  sumReleasedAmount,
  type PreFinancingReleaseRecord,
} from "@/lib/pre-financing-records";

const RECORD_COPY: Record<FinanceRecordsView, string> = {
  first_pre_financing:
    "Read-only view of first pre-financing tranche releases for audit review.",
  second_pre_financing:
    "Read-only view of second pre-financing tranche releases for audit review.",
  third_pre_financing:
    "Read-only view of third pre-financing tranche releases for audit review.",
};

function formatAmount(amount: string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function FinanceAuditorFinancialRecords() {
  const searchParams = useSearchParams();
  const activeView = parseFinanceRecordsView(searchParams.get("record"));
  const pageTitle = FINANCE_RECORDS_VIEW_LABELS[activeView];

  const [records, setRecords] = useState<PreFinancingReleaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setRecords(loadPreFinancingReleases(activeView));
    setLoading(false);
  }, [activeView]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) =>
        (b.releaseDate || b.createdAt).localeCompare(
          a.releaseDate || a.createdAt
        )
      ),
    [records]
  );

  const totalReleased = useMemo(
    () => sumReleasedAmount(sortedRecords),
    [sortedRecords]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Financial Records · Finance Auditor workspace
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#062763] bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Total released
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : formatReleasedEuros(totalReleased)}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Overall tranche total (EUR)
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#f7be2a] bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Releases
            </p>
            <p className="mt-3 text-2xl font-bold text-[#062763]">
              {loading ? "—" : sortedRecords.length}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Pre-financing entries in this tranche
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
            Pre-financing releases
          </p>
          <h2 className="mt-2 text-lg font-bold text-[#062763]">{pageTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            {RECORD_COPY[activeView]}
          </p>

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
              Loading financial records…
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No {pageTitle.toLowerCase()} records yet.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Releases created by the finance coordinator will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                  <tr>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Finance officer</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Release date</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-[#062763]/5">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {record.partner}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {record.financeOfficerName || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {record.reference}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#062763]">
                        {formatAmount(record.amount, record.currency)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {record.releaseDate}
                      </td>
                      <td className="max-w-64 truncate px-4 py-3 text-slate-700">
                        {record.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
