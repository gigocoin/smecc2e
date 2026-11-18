import type { FinanceRecordsView } from "@/lib/finance-coordinator-nav";
import { FINANCE_RECORDS_NAV } from "@/lib/finance-coordinator-nav";

export type PreFinancingReleaseRecord = {
  id: string;
  partner: string;
  financeOfficerId?: string;
  financeOfficerName?: string;
  reference: string;
  amount: string;
  currency: string;
  releaseDate: string;
  notes: string;
  createdAt: string;
};

function storageKey(view: FinanceRecordsView): string {
  return `smecc2e.finance-coordinator.pre-financing.${view}`;
}

export function loadPreFinancingReleases(
  view: FinanceRecordsView
): PreFinancingReleaseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(view));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PreFinancingReleaseRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is PreFinancingReleaseRecord =>
        Boolean(record?.id && record.partner && record.reference)
    );
  } catch {
    return [];
  }
}

export function sumReleasedAmount(records: PreFinancingReleaseRecord[]): number {
  return records.reduce((sum, record) => {
    const value = Number(record.amount);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export function formatReleasedEuros(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function loadReleasedTotalsByTranche(): Record<
  FinanceRecordsView,
  number
> {
  const totals = {
    first_pre_financing: 0,
    second_pre_financing: 0,
    third_pre_financing: 0,
  } as Record<FinanceRecordsView, number>;

  for (const item of FINANCE_RECORDS_NAV) {
    totals[item.id] = sumReleasedAmount(loadPreFinancingReleases(item.id));
  }
  return totals;
}
