"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMilestoneId,
  formatMilestoneDueDate,
  getMilestoneCountdown,
  isMilestoneStatus,
  MILESTONE_STATUSES,
  type MilestoneStatus,
  type ProjectMilestone,
} from "@/lib/project-milestones";

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const selectClass =
  "rounded-lg border-2 border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

function emptyForm() {
  return {
    name: "",
    milestoneNo: "",
    workPackageNo: "",
    leadBeneficiary: "",
    meansOfVerification: "",
    dueDate: "",
    status: "Not Started" as MilestoneStatus,
  };
}

function CountdownCell({ dueDate }: { dueDate: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = useMemo(
    () => getMilestoneCountdown(dueDate, now),
    [dueDate, now]
  );

  if (!dueDate.trim()) {
    return <span className="font-semibold text-slate-500">—</span>;
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

function statusBadgeClass(status: MilestoneStatus): string {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-900";
    case "On-going":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

export function CoordinatorProjectMilestones({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/project-milestones");
      const data = (await res.json()) as {
        milestones?: ProjectMilestone[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load milestones");
      }
      setMilestones(data.milestones ?? []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load milestones"
      );
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMilestones();
  }, [fetchMilestones]);

  useEffect(() => {
    if (!saveMessage) return;
    const id = window.setTimeout(() => setSaveMessage(null), 4000);
    return () => window.clearTimeout(id);
  }, [saveMessage]);

  const sortedMilestones = useMemo(
    () =>
      [...milestones].sort((a, b) => {
        const aDue = a.dueDate || "9999-12-31";
        const bDue = b.dueDate || "9999-12-31";
        return aDue.localeCompare(bDue) || a.name.localeCompare(b.name);
      }),
    [milestones]
  );

  const resetCreateForm = () => {
    setForm(emptyForm());
    setCreateError(null);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setCreateError("Enter the milestone name.");
      return;
    }
    if (form.dueDate && Number.isNaN(new Date(form.dueDate).getTime())) {
      setCreateError("Enter a valid due date.");
      return;
    }

    const milestone: ProjectMilestone = {
      id: createMilestoneId(),
      name: form.name.trim(),
      milestoneNo: form.milestoneNo.trim(),
      workPackageNo: form.workPackageNo.trim(),
      leadBeneficiary: form.leadBeneficiary.trim(),
      meansOfVerification: form.meansOfVerification.trim(),
      dueDate: form.dueDate.trim(),
      status: form.status,
    };

    setMilestones((prev) => [...prev, milestone]);
    setSaveMessage(null);
    setSaveError(null);
    closeCreateModal();
  };

  const handleStatusChange = (id: string, status: MilestoneStatus) => {
    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === id ? { ...milestone, status } : milestone
      )
    );
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleSaveMilestones = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/project-milestones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestones }),
      });
      const data = (await res.json()) as {
        milestones?: ProjectMilestone[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save milestones");
      }
      setMilestones(data.milestones ?? milestones);
      setSaveMessage(
        `Saved ${data.milestones?.length ?? milestones.length} milestone${
          (data.milestones?.length ?? milestones.length) === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save milestones"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 w-full max-w-full">
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
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
            >
              Add Milestone
            </button>
            <button
              type="button"
              onClick={() => void handleSaveMilestones()}
              disabled={saving || loading}
              className="rounded-lg border-2 border-[#062763] px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Milestones"}
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800" role="alert">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void fetchMilestones()}
            className="rounded-lg border-2 border-red-300 px-3 py-1.5 text-xs font-semibold text-red-900 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-[#062763]">Milestones</h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {loading
              ? "Loading milestones…"
              : sortedMilestones.length === 0
                ? "No milestones yet."
                : `${sortedMilestones.length} milestone${
                    sortedMilestones.length === 1 ? "" : "s"
                  }.`}
          </p>
        </div>
        <div className="h-[60vh] min-w-0 overflow-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Milestone No</th>
                <th className="px-4 py-3">Milestone Name</th>
                <th className="px-4 py-3">Work Package No</th>
                <th className="px-4 py-3">Lead Beneficiary</th>
                <th className="px-4 py-3">Means of Verification</th>
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
                    Loading milestones…
                  </td>
                </tr>
              ) : sortedMilestones.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    {canManage
                      ? "No milestones yet. Add one, then Save Milestones."
                      : "No milestones yet."}
                  </td>
                </tr>
              ) : (
                sortedMilestones.map((milestone) => (
                  <tr key={milestone.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {milestone.milestoneNo || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {milestone.name}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {milestone.workPackageNo || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {milestone.leadBeneficiary || "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      {milestone.meansOfVerification || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatMilestoneDueDate(milestone.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={milestone.status}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (!isMilestoneStatus(next)) return;
                            handleStatusChange(milestone.id, next);
                          }}
                          className={selectClass}
                        >
                          {MILESTONE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(
                            milestone.status
                          )}`}
                        >
                          {milestone.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CountdownCell dueDate={milestone.dueDate} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-milestone-title"
          onClick={closeCreateModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-milestone-title"
              className="shrink-0 border-b border-slate-100 px-5 py-3 text-base font-bold text-[#062763]"
            >
              Add Milestone
            </h2>
            <form
              onSubmit={handleCreateMilestone}
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Milestone No
                </label>
                <input
                  value={form.milestoneNo}
                 
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      milestoneNo: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="e.g. M1.2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Milestone Name
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
                  Means of Verification
                </label>
                <textarea
                  rows={3}
                  value={form.meansOfVerification}
                 
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      meansOfVerification: e.target.value,
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
                    const next = e.target.value;
                    if (!isMilestoneStatus(next)) return;
                    setForm((prev) => ({ ...prev, status: next }));
                  }}
                  className={inputClass}
                >
                  {MILESTONE_STATUSES.map((status) => (
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
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
