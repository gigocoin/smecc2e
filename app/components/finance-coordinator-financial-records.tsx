"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  FINANCE_RECORDS_VIEW_LABELS,
  parseFinanceRecordsView,
  type FinanceRecordsView,
} from "@/lib/finance-coordinator-nav";
import type { DashboardUser } from "@/lib/dashboard-users";

const RECORD_COPY: Record<FinanceRecordsView, string> = {
  first_pre_financing:
    "First pre-financing tranche records, releases, and supporting documentation.",
  second_pre_financing:
    "Second pre-financing tranche records, releases, and supporting documentation.",
  third_pre_financing:
    "Third pre-financing tranche records, releases, and supporting documentation.",
};

type FinanceOfficerOption = {
  id: string;
  name: string;
  email: string;
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

type PreFinancingFormState = {
  partner: string;
  financeOfficerId: string;
  reference: string;
  amount: string;
  currency: string;
  releaseDate: string;
  notes: string;
};

const EMPTY_FORM: PreFinancingFormState = {
  partner: "",
  financeOfficerId: "",
  reference: "",
  amount: "",
  currency: "EUR",
  releaseDate: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const iconBtnClass =
  "inline-flex rounded-lg border-2 p-1.5 transition disabled:opacity-50";

function storageKey(view: FinanceRecordsView): string {
  return `smecc2e.finance-coordinator.pre-financing.${view}`;
}

function normalizeRecord(raw: Partial<PreFinancingRecord>): PreFinancingRecord | null {
  if (!raw.id || !raw.partner || !raw.reference) return null;
  return {
    id: raw.id,
    partner: raw.partner,
    financeOfficerId: raw.financeOfficerId ?? "",
    financeOfficerName: raw.financeOfficerName ?? "",
    reference: raw.reference,
    amount: raw.amount ?? "",
    currency: raw.currency ?? "EUR",
    releaseDate: raw.releaseDate ?? "",
    notes: raw.notes ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function loadRecords(view: FinanceRecordsView): PreFinancingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(view));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PreFinancingRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecord)
      .filter((record): record is PreFinancingRecord => record != null);
  } catch {
    return [];
  }
}

function saveRecords(view: FinanceRecordsView, records: PreFinancingRecord[]) {
  localStorage.setItem(storageKey(view), JSON.stringify(records));
}

function formatAmount(amount: string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

const TRANCHE_PREFIX: Record<FinanceRecordsView, string> = {
  first_pre_financing: "PF1",
  second_pre_financing: "PF2",
  third_pre_financing: "PF3",
};

function nextReference(
  view: FinanceRecordsView,
  existing: PreFinancingRecord[]
): string {
  const year = new Date().getFullYear();
  const prefix = `${TRANCHE_PREFIX[view]}-${year}-`;
  const nums = existing
    .map((record) => {
      const match = record.reference.match(
        new RegExp(`^${TRANCHE_PREFIX[view]}-${year}-(\\d+)$`, "i")
      );
      return match ? parseInt(match[1]!, 10) : null;
    })
    .filter((value): value is number => value != null && Number.isFinite(value));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function emptyFormWithReference(
  view: FinanceRecordsView,
  existing: PreFinancingRecord[]
): PreFinancingFormState {
  return {
    ...EMPTY_FORM,
    reference: nextReference(view, existing),
  };
}

function formFromRecord(record: PreFinancingRecord): PreFinancingFormState {
  return {
    partner: record.partner,
    financeOfficerId: record.financeOfficerId,
    reference: record.reference,
    amount: record.amount,
    currency: record.currency,
    releaseDate: record.releaseDate,
    notes: record.notes,
  };
}

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

export function FinanceCoordinatorFinancialRecords() {
  const searchParams = useSearchParams();
  const activeView = parseFinanceRecordsView(searchParams.get("record"));
  const pageTitle = FINANCE_RECORDS_VIEW_LABELS[activeView];

  const [records, setRecords] = useState<PreFinancingRecord[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionsError, setInstitutionsError] = useState<string | null>(
    null
  );
  const [financeOfficers, setFinanceOfficers] = useState<FinanceOfficerOption[]>(
    []
  );
  const [financeOfficersLoading, setFinanceOfficersLoading] = useState(false);
  const [financeOfficersError, setFinanceOfficersError] = useState<string | null>(
    null
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PreFinancingRecord | null>(
    null
  );
  const [deletingRecord, setDeletingRecord] =
    useState<PreFinancingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState<PreFinancingFormState>(EMPTY_FORM);

  const modalOpen = createOpen || editingRecord != null;
  const tableBusy = saving || deleting;

  useEffect(() => {
    const loaded = loadRecords(activeView);
    setRecords(loaded);
    setCreateOpen(false);
    setEditingRecord(null);
    setDeletingRecord(null);
    setFormError(null);
    setDeleteError(null);
    setForm(emptyFormWithReference(activeView, loaded));
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setInstitutionsLoading(true);
      setInstitutionsError(null);
      try {
        const res = await fetch("/api/universities", { cache: "no-store" });
        const data = (await res.json()) as {
          universityNames?: string[];
          universities?: { name: string }[];
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setInstitutions([]);
            setInstitutionsError(
              data.error ?? "Could not load institutions."
            );
          }
          return;
        }
        const names =
          data.universityNames ??
          (data.universities ?? []).map((university) => university.name);
        if (!cancelled) {
          setInstitutions(
            [...new Set(names.filter(Boolean))].sort((a, b) =>
              a.localeCompare(b)
            )
          );
        }
      } catch {
        if (!cancelled) {
          setInstitutions([]);
          setInstitutionsError("Could not load institutions.");
        }
      } finally {
        if (!cancelled) setInstitutionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFinanceOfficersLoading(true);
      setFinanceOfficersError(null);
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        const data = (await res.json()) as {
          users?: DashboardUser[];
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setFinanceOfficers([]);
            setFinanceOfficersError(
              data.error ?? "Could not load finance officers."
            );
          }
          return;
        }
        const officers = (data.users ?? [])
          .filter(
            (user) =>
              user.role === "Finance Officer" && user.status === "Active"
          )
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setFinanceOfficers(officers);
      } catch {
        if (!cancelled) {
          setFinanceOfficers([]);
          setFinanceOfficersError("Could not load finance officers.");
        }
      } finally {
        if (!cancelled) setFinanceOfficersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) =>
        (b.releaseDate || b.createdAt).localeCompare(a.releaseDate || a.createdAt)
      ),
    [records]
  );

  const partnerOptions = useMemo(() => {
    const names = new Set(institutions);
    if (form.partner) names.add(form.partner);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [institutions, form.partner]);

  const financeOfficerOptions = useMemo(() => {
    const byId = new Map(
      financeOfficers.map((officer) => [officer.id, officer] as const)
    );
    if (
      form.financeOfficerId &&
      !byId.has(form.financeOfficerId) &&
      editingRecord?.financeOfficerId === form.financeOfficerId
    ) {
      byId.set(form.financeOfficerId, {
        id: form.financeOfficerId,
        name: editingRecord.financeOfficerName || "Previously assigned officer",
        email: "",
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [financeOfficers, form.financeOfficerId, editingRecord]);

  const closeFormModal = () => {
    if (saving) return;
    setCreateOpen(false);
    setEditingRecord(null);
    setFormError(null);
    setForm(emptyFormWithReference(activeView, records));
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormError(null);
    setForm(emptyFormWithReference(activeView, records));
    setCreateOpen(true);
  };

  const openEditModal = (record: PreFinancingRecord) => {
    setCreateOpen(false);
    setDeletingRecord(null);
    setFormError(null);
    setEditingRecord(record);
    setForm(formFromRecord(record));
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingRecord(null);
    setDeleteError(null);
  };

  const validateForm = () => {
    const partner = form.partner.trim();
    const financeOfficerId = form.financeOfficerId.trim();
    const amount = form.amount.trim();
    const releaseDate = form.releaseDate.trim();

    if (!partner) return "Select a partner institution.";
    if (
      !institutions.includes(partner) &&
      !(editingRecord && editingRecord.partner === partner)
    ) {
      return "Select a valid partner institution.";
    }
    if (!financeOfficerId) return "Select a finance officer.";
    if (
      !financeOfficers.some((officer) => officer.id === financeOfficerId) &&
      !(
        editingRecord &&
        editingRecord.financeOfficerId === financeOfficerId
      )
    ) {
      return "Select a valid finance officer.";
    }
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return "Enter a valid amount greater than zero.";
    }
    if (!releaseDate) return "Release date is required.";
    return null;
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const partner = form.partner.trim();
    const financeOfficerId = form.financeOfficerId.trim();
    const selectedOfficer =
      financeOfficers.find((officer) => officer.id === financeOfficerId) ??
      (editingRecord?.financeOfficerId === financeOfficerId
        ? {
            id: editingRecord.financeOfficerId,
            name: editingRecord.financeOfficerName,
            email: "",
          }
        : null);
    const financeOfficerName = selectedOfficer?.name ?? "";
    const amount = form.amount.trim();
    const currency = form.currency.trim().toUpperCase() || "EUR";
    const releaseDate = form.releaseDate.trim();
    const notes = form.notes.trim();

    setSaving(true);
    try {
      let updated = records;
      if (editingRecord) {
        updated = records.map((record) =>
          record.id === editingRecord.id
            ? {
                ...record,
                partner,
                financeOfficerId,
                financeOfficerName,
                amount,
                currency,
                releaseDate,
                notes,
              }
            : record
        );
      } else {
        const reference =
          form.reference.trim() || nextReference(activeView, records);
        const next: PreFinancingRecord = {
          id: `PF-${Date.now()}`,
          partner,
          financeOfficerId,
          financeOfficerName,
          reference,
          amount,
          currency,
          releaseDate,
          notes,
          createdAt: new Date().toISOString(),
        };
        updated = [next, ...records];
      }
      saveRecords(activeView, updated);
      setRecords(updated);
      setCreateOpen(false);
      setEditingRecord(null);
      setFormError(null);
      setForm(emptyFormWithReference(activeView, updated));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!deletingRecord) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const updated = records.filter(
        (record) => record.id !== deletingRecord.id
      );
      saveRecords(activeView, updated);
      setRecords(updated);
      setDeletingRecord(null);
      setForm(emptyFormWithReference(activeView, updated));
    } catch {
      setDeleteError("Could not delete this pre-financing record.");
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
            Financial Records · Finance Coordinator workspace
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={tableBusy}
          className="shrink-0 rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
        >
          Add Pre-Financing
        </button>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
            Pre-financing record
          </p>
          <h2 className="mt-2 text-lg font-bold text-[#062763]">{pageTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            {RECORD_COPY[activeView]}
          </p>

          {sortedRecords.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No {pageTitle.toLowerCase()} records yet.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Use Add Pre-Financing to create the first entry for this tranche.
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
                    <th className="px-4 py-3 text-right">Actions</th>
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
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            title="Edit"
                            aria-label={`Edit ${record.reference}`}
                            onClick={() => openEditModal(record)}
                            disabled={tableBusy}
                            className={`${iconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            aria-label={`Delete ${record.reference}`}
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingRecord(record);
                            }}
                            disabled={tableBusy}
                            className={`${iconBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pre-financing-form-title"
          onClick={closeFormModal}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2
                id="pre-financing-form-title"
                className="text-base font-bold text-[#062763]"
              >
                {editingRecord ? "Edit Pre-Financing" : "Add Pre-Financing"}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {editingRecord
                  ? `Update ${editingRecord.reference} under ${pageTitle}.`
                  : `Create a new entry under ${pageTitle}.`}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4 px-5 py-5">
              <div>
                <label
                  htmlFor="pre-financing-partner"
                  className="block text-xs font-bold text-slate-800"
                >
                  Partner / beneficiary
                </label>
                <select
                  id="pre-financing-partner"
                  value={form.partner}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      partner: event.target.value,
                    }))
                  }
                  disabled={saving || institutionsLoading}
                  className={inputClass}
                >
                  <option value="">
                    {institutionsLoading
                      ? "Loading institutions…"
                      : "Select an institution"}
                  </option>
                  {partnerOptions.map((institution) => (
                    <option key={institution} value={institution}>
                      {institution}
                    </option>
                  ))}
                </select>
                {institutionsError ? (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    {institutionsError}
                  </p>
                ) : null}
                {!institutionsLoading &&
                !institutionsError &&
                institutions.length === 0 ? (
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    No institutions are configured yet.
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="pre-financing-finance-officer"
                  className="block text-xs font-bold text-slate-800"
                >
                  Finance officer
                </label>
                <select
                  id="pre-financing-finance-officer"
                  value={form.financeOfficerId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      financeOfficerId: event.target.value,
                    }))
                  }
                  disabled={saving || financeOfficersLoading}
                  className={inputClass}
                >
                  <option value="">
                    {financeOfficersLoading
                      ? "Loading finance officers…"
                      : "Select a finance officer"}
                  </option>
                  {financeOfficerOptions.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.email
                        ? `${officer.name} (${officer.email})`
                        : officer.name}
                    </option>
                  ))}
                </select>
                {financeOfficersError ? (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    {financeOfficersError}
                  </p>
                ) : null}
                {!financeOfficersLoading &&
                !financeOfficersError &&
                financeOfficers.length === 0 ? (
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    No active finance officers are available yet.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="pre-financing-reference"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Reference
                  </label>
                  <input
                    id="pre-financing-reference"
                    value={form.reference}
                    readOnly
                    disabled={saving}
                    className={`${inputClass} bg-slate-50 text-slate-700`}
                    aria-describedby="pre-financing-reference-help"
                  />
                  <p
                    id="pre-financing-reference-help"
                    className="mt-1 text-xs font-medium text-slate-600"
                  >
                    {editingRecord
                      ? "Reference stays the same when editing."
                      : "Generated automatically for this tranche."}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="pre-financing-date"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Release date
                  </label>
                  <input
                    id="pre-financing-date"
                    type="date"
                    value={form.releaseDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        releaseDate: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="pre-financing-amount"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Amount
                  </label>
                  <input
                    id="pre-financing-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label
                    htmlFor="pre-financing-currency"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Currency
                  </label>
                  <input
                    id="pre-financing-currency"
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className={inputClass}
                    placeholder="EUR"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pre-financing-notes"
                  className="block text-xs font-bold text-slate-800"
                >
                  Notes
                </label>
                <textarea
                  id="pre-financing-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className={inputClass}
                  placeholder="Optional notes"
                />
              </div>

              {formError ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : editingRecord
                      ? "Save changes"
                      : "Save pre-financing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingRecord ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-pre-financing-title"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2
                id="delete-pre-financing-title"
                className="text-base font-bold text-[#062763]"
              >
                Delete Pre-Financing
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-700">
                Delete{" "}
                <strong className="text-slate-900">
                  {deletingRecord.reference}
                </strong>{" "}
                for{" "}
                <strong className="text-slate-900">
                  {deletingRecord.partner}
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
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
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
