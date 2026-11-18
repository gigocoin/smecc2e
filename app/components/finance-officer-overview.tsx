"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FINANCE_OFFICER_BASE_PATH } from "@/lib/finance-officer-nav";

type OverviewCard = {
  label: string;
  value: string;
  detail: string;
  href: string;
  accent: string;
};

const root = FINANCE_OFFICER_BASE_PATH;

const CARDS: OverviewCard[] = [
  {
    label: "1st Pre-Financing",
    value: "—",
    detail: "First tranche releases and supporting records",
    href: `${root}/financial-records`,
    accent: "border-t-[#062763]",
  },
  {
    label: "2nd Pre-Financing",
    value: "—",
    detail: "Second tranche releases and supporting records",
    href: `${root}/financial-records?record=second_pre_financing`,
    accent: "border-t-emerald-500",
  },
  {
    label: "3rd Pre-Financing",
    value: "—",
    detail: "Third tranche releases and supporting records",
    href: `${root}/financial-records?record=third_pre_financing`,
    accent: "border-t-[#f7be2a]",
  },
];

export function FinanceOfficerOverview() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { user?: { name?: string } };
        if (data.user?.name) setName(data.user.name);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            Overview
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Finance officer · SMECC2E mobility programme
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#062763_0%,#0a3580_55%,#134a9c_100%)] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f7be2a]">
            Welcome
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            {name ? `${name}` : "Finance Officer"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/85">
            Review assigned pre-financing records, track tranche activity, and
            keep your profile details current from this workspace.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`${root}/financial-records`}
              className="rounded-lg bg-[#f7be2a] px-4 py-2 text-sm font-bold text-[#062763] transition hover:bg-white"
            >
              Open financial records
            </Link>
            <Link
              href={`${root}/profile`}
              className="rounded-lg border border-white/35 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View profile
            </Link>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#062763]">
                Finance snapshot
              </h3>
              <p className="text-xs font-medium text-slate-600">
                Jump into the main finance work areas
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CARDS.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`rounded-xl border border-slate-200 border-t-4 bg-white px-4 py-5 shadow-sm transition hover:border-[#062763]/25 hover:shadow-md ${card.accent}`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-[#062763]">
                  {card.value}
                </p>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
                  {card.detail}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
