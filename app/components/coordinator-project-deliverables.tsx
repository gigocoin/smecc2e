"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDeliverableId,
  DELIVERABLE_STATUSES,
  formatDeliverableDueDate,
  getDeliverableCountdown,
  isDeliverableStatus,
  parseDeliverableDueDate,
  type DeliverableStatus,
  type ProjectDeliverable,
} from "@/lib/project-deliverables";

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const selectClass =
  "rounded-lg border-2 border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

function emptyForm() {
  return {
    workPackageNo: "",
    deliverableNo: "",
    name: "",
    description: "",
    leadBeneficiary: "",
    dueDate: "",
    status: "Not Started" as DeliverableStatus,
  };
}

function CountdownCell({ dueDate }: { dueDate: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = useMemo(
    () => getDeliverableCountdown(dueDate, now),
    [dueDate, now]
  );

  if (!dueDate.trim()) {
    return <span className="font-semibold text-slate-500">â€”</span>;
  }

  return (
    <span
      className={`font-mono text-xs font-bold tabular-nums ${
        countdown.expired ? "text-red-700" : "text-[#062763]"
      }`}
    >
      {countdown.label}
    </span>
  );
}

function statusBadgeClass(status: DeliverableStatus): string {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-900";
    case "On-going":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

function DeliverableStatusControl({
  deliverable,
  canManage,
  onStatusChange,
}: {
  deliverable: ProjectDeliverable;
  canManage: boolean;
  onStatusChange: (id: string, status: DeliverableStatus) => void;
}) {
  if (canManage) {
    return (
      <select
        value={deliverable.status}
        onChange={(e) => {
          const value = e.target.value;
          if (isDeliverableStatus(value)) {
            onStatusChange(deliverable.id, value);
          }
        }}
        className={selectClass}
        aria-label={`Status for ${deliverable.name}`}
      >
        {DELIVERABLE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
        deliverable.status
      )}`}
    >
      {deliverable.status}
    </span>
  );
}

export function CoordinatorProjectDeliverables({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchDeliverables = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/project-deliverables");
      const data = (await res.json()) as {
        deliverables?: ProjectDeliverable[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load deliverables");
      }
      setDeliverables(data.deliverables ?? []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load deliverables"
      );
      setDeliverables([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDeliverables();
  }, [fetchDeliverables]);

  useEffect(() => {
    if (!saveMessage) return;
    const id = window.setTimeout(() => setSaveMessage(null), 4000);
    return () => window.clearTimeout(id);
  }, [saveMessage]);

  const sortedDeliverables = useMemo(
    () =>
      [...deliverables].sort((a, b) => {
        const aParsed = parseDeliverableDueDate(a.dueDate);
        const bParsed = parseDeliverableDueDate(b.dueDate);
        const aSort = aParsed?.getTime() ?? Number.POSITIVE_INFINITY;
        const bSort = bParsed?.getTime() ?? Number.POSITIVE_INFINITY;
        if (aSort !== bSort) return aSort - bSort;
        return (
          a.workPackageNo.localeCompare(b.workPackageNo) ||
          a.deliverableNo.localeCompare(b.deliverableNo) ||
          a.name.localeCompare(b.name)
        );
      }),
    [deliverables]
  );

  const resetCreateForm = () => {
    setForm(emptyForm());
    setCreateError(null);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  const handleCreateDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setCreateError("Enter the deliverable name.");
      return;
    }
    if (form.dueDate && Number.isNaN(new Date(form.dueDate).getTime())) {
      setCreateError("Enter a valid due date.");
      return;
    }

    const deliverable: ProjectDeliverable = {
      id: createDeliverableId(),
      workPackageNo: form.workPackageNo.trim(),
      deliverableNo: form.deliverableNo.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      leadBeneficiary: form.leadBeneficiary.trim(),
      dueDate: form.dueDate.trim(),
      status: form.status,
    };

    setDeliverables((prev) => [...prev, deliverable]);
    setSaveMessage(null);
    setSaveError(null);
    closeCreateModal();
  };

  const handleStatusChange = (id: string, status: DeliverableStatus) => {
    setDeliverables((prev) =>
      prev.map((deliverable) =>
        deliverable.id === id ? { ...deliverable, status } : deliverable
      )
    );
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleSaveDeliverables = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/project-deliverables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverables }),
      });
      const data = (await res.json()) as {
        deliverables?: ProjectDeliverable[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save deliverables");
      }
      setDeliverables(data.deliverables ?? deliverables);
      setSaveMessage(
        `Saved ${data.deliverables?.length ?? deliverables.length} deliverable${
          (data.deliverables?.length ?? deliverables.length) === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save deliverables"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div aria-live="polite" className="min-h-5">
          {saveMessage && (
            <p className="text-sm font-semibold text-emerald-800">
              {saveMessage}
            </p>
          )}
          {saveError && (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {saveError}
            </p>
          )}
          {loadError && (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {loadError}
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
            >
              Add Deliverables
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDeliverables()}
              disabled={saving || loading}
              className="rounded-lg border-2 border-[#062763] px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
            >
              {saving ? "Savingâ€¦" : "Save Deliverables"}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold text-[#062763]">Deliverables</h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {loading
              ? "Loading deliverablesâ€¦"
              : sortedDeliverables.length === 0
                ? "No deliverables yet."
                : `${sortedDeliverables.length} deliverable${
                    sortedDeliverables.length === 1 ? "" : "s"
                  }.`}
          </p>
        </div>

        <div className="h-[60vh] min-w-0 overflow-auto">
          {/* Mobile / tablet card layout */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm font-semibold text-slate-700">
                Loading deliverablesâ€¦
              </p>
            ) : sortedDeliverables.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-semibold text-slate-700">
                {canManage
                  ? "No deliverables yet. Add one, then Save Deliverables."
                  : "No deliverables yet."}
              </p>
            ) : (
              sortedDeliverables.map((deliverable) => (
                <article
                  key={deliverable.id}
                  className="space-y-3 px-4 py-4 sm:px-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#062763]/70">
                        {[deliverable.deliverableNo, deliverable.workPackageNo]
                          .filter(Boolean)
                          .join(" Â· ") || "Deliverable"}
                      </p>
                      <h3 className="mt-1 text-sm font-bold text-slate-900">
                        {deliverable.name}
                      </h3>
                    </div>
                    <DeliverableStatusControl
                      deliverable={deliverable}
                      canManage={canManage}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                  {deliverable.description ? (
                    <p className="text-sm font-medium text-slate-800">
                      {deliverable.description}
                    </p>
                  ) : null}
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold text-slate-500">
                        Lead Beneficiary
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {deliverable.leadBeneficiary || "â€”"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">
                        Due Date
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {formatDeliverableDueDate(deliverable.dueDate)}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-bold text-slate-500">
                        Countdown
                      </dt>
                      <dd className="mt-0.5">
                        <CountdownCell dueDate={deliverable.dueDate} />
                      </dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden min-w-0 lg:block">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-4 py-3">Work Package No</th>
                  <th className="px-4 py-3">Deliverable No</th>
                  <th className="px-4 py-3">Deliverable Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Lead Beneficiary</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Countdown Timer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center font-semibold text-slate-700"
                    >
                      Loading deliverablesâ€¦
                    </td>
                  </tr>
                ) : sortedDeliverables.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center font-semibold text-slate-700"
                    >
                      {canManage
                        ? "No deliverables yet. Add one, then Save Deliverables."
                        : "No deliverables yet."}
                    </td>
                  </tr>
                ) : (
                  sortedDeliverables.map((deliverable) => (
                    <tr key={deliverable.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {deliverable.workPackageNo || "â€”"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {deliverable.deliverableNo || "â€”"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {deliverable.name}
                      </td>
                      <td className="max-w-sm px-4 py-3 font-medium text-slate-900">
                        <span className="line-clamp-3">
                          {deliverable.description || "â€”"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {deliverable.leadBeneficiary || "â€”"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatDeliverableDueDate(deliverable.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <DeliverableStatusControl
                          deliverable={deliverable}
                          canManage={canManage}
                          onStatusChange={handleStatusChange}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CountdownCell dueDate={deliverable.dueDate} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {canManage && createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-deliverable-title"
          onClick={closeCreateModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-deliverable-title"
              className="shrink-0 border-b border-slate-100 px-5 py-3 text-base font-bold text-[#062763]"
            >
              Add Deliverables
            </h2>
            <form
              onSubmit={handleCreateDeliverable}
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Work Package No
                </label>
                <input
                  value={form.workPackageNo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workPackageNo: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Deliverable No
                </label>
                <input
                  value={form.deliverableNo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deliverableNo: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Deliverable Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Lead Beneficiary
                </label>
                <input
                  value={form.leadBeneficiary}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      leadBeneficiary: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isDeliverableStatus(value)) {
                      setForm((prev) => ({ ...prev, status: value }));
                    }
                  }}
                  className={inputClass}
                >
                  {DELIVERABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              {createError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {createError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
                >
                  Add Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </>
  );
}
