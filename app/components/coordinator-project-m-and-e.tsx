"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calculateMandECompletionRate,
  createMandEId,
  type ProjectMandEIndicator,
} from "@/lib/project-m-and-e";

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

function emptyForm() {
  return {
    indicator: "",
    type: "",
    unitOfMeasurement: "",
    baselineValue: "",
    targetValue: "",
    currentStatus: "",
  };
}

export function CoordinatorProjectMandE({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [indicators, setIndicators] = useState<ProjectMandEIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchIndicators = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/project-m-and-e");
      const data = (await res.json()) as {
        indicators?: ProjectMandEIndicator[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load M&E indicators");
      }
      setIndicators(data.indicators ?? []);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load M&E indicators"
      );
      setIndicators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIndicators();
  }, [fetchIndicators]);

  useEffect(() => {
    if (!reminderMessage && !saveMessage) return;
    const id = window.setTimeout(() => {
      setReminderMessage(null);
      setSaveMessage(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [reminderMessage, saveMessage]);

  const sortedIndicators = useMemo(
    () =>
      [...indicators].sort((a, b) => a.indicator.localeCompare(b.indicator)),
    [indicators]
  );

  const resetCreateForm = () => {
    setForm(emptyForm());
    setCreateError(null);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  const previewCompletionRate = calculateMandECompletionRate(
    form.currentStatus,
    form.targetValue,
    form.baselineValue
  );

  const handleCreateIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.indicator.trim()) {
      setCreateError("Enter the indicator.");
      return;
    }

    const baselineValue = form.baselineValue.trim();
    const targetValue = form.targetValue.trim();
    const currentStatus = form.currentStatus.trim();

    const indicator: ProjectMandEIndicator = {
      id: createMandEId(),
      indicator: form.indicator.trim(),
      type: form.type.trim(),
      unitOfMeasurement: form.unitOfMeasurement.trim(),
      baselineValue,
      targetValue,
      currentStatus,
      completionRate: calculateMandECompletionRate(
        currentStatus,
        targetValue,
        baselineValue
      ),
    };

    setIndicators((prev) => [...prev, indicator]);
    setSaveMessage(null);
    setSaveError(null);
    closeCreateModal();
  };

  const handleSendReminder = (indicator: ProjectMandEIndicator) => {
    setReminderMessage(`Reminder sent for “${indicator.indicator}”.`);
  };

  const handleCurrentStatusChange = (id: string, currentStatus: string) => {
    setIndicators((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              currentStatus,
              completionRate: calculateMandECompletionRate(
                currentStatus,
                item.targetValue,
                item.baselineValue
              ),
            }
          : item
      )
    );
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleSaveMandE = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/project-m-and-e", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indicators }),
      });
      const data = (await res.json()) as {
        indicators?: ProjectMandEIndicator[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save M&E indicators");
      }
      setIndicators(data.indicators ?? indicators);
      setSaveMessage(
        `Saved ${data.indicators?.length ?? indicators.length} indicator${
          (data.indicators?.length ?? indicators.length) === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save M&E indicators"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div aria-live="polite" className="min-h-5">
          {reminderMessage && (
            <p className="text-sm font-semibold text-emerald-800">
              {reminderMessage}
            </p>
          )}
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
              Add M&amp;E
            </button>
            <button
              type="button"
              onClick={() => void handleSaveMandE()}
              disabled={saving || loading}
              className="rounded-lg border-2 border-[#062763] px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save M&E"}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-[#062763]">
            Monitoring &amp; Evaluation
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {loading
              ? "Loading indicators…"
              : sortedIndicators.length === 0
                ? "No indicators yet."
                : `${sortedIndicators.length} indicator${
                    sortedIndicators.length === 1 ? "" : "s"
                  }.`}
          </p>
        </div>
        <div className="h-[60vh] min-w-0 overflow-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Indicator</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Unit of Measurement</th>
                <th className="px-4 py-3">Baseline Value</th>
                <th className="px-4 py-3">
                  Target Value (at the end of the project)
                </th>
                <th className="px-4 py-3">Current Status</th>
                <th className="px-4 py-3">Completion Rate (%)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    Loading indicators…
                  </td>
                </tr>
              ) : sortedIndicators.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    {canManage
                      ? "No indicators yet. Add one, then Save M&E to store it."
                      : "No indicators yet."}
                  </td>
                </tr>
              ) : (
                sortedIndicators.map((indicator) => (
                  <tr key={indicator.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {indicator.indicator}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {indicator.type || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {indicator.unitOfMeasurement || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {indicator.baselineValue || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {indicator.targetValue || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <input
                          value={indicator.currentStatus}
                          onChange={(e) =>
                            handleCurrentStatusChange(
                              indicator.id,
                              e.target.value
                            )
                          }
                          className="w-full min-w-[10rem] rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
                        />
                      ) : (
                        <span className="font-medium text-slate-900">
                          {indicator.currentStatus || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[8rem] items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#062763]"
                            style={{ width: `${indicator.completionRate}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-bold text-slate-800">
                          {indicator.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => handleSendReminder(indicator)}
                          className="rounded-lg border-2 border-[#062763]/25 px-3 py-1.5 text-xs font-semibold text-[#062763] transition hover:bg-[#062763]/5"
                        >
                          Send Reminder
                        </button>
                      ) : (
                        "—"
                      )}
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
          aria-labelledby="add-m-and-e-title"
          onClick={closeCreateModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-m-and-e-title"
              className="shrink-0 border-b border-slate-100 px-5 py-3 text-base font-bold text-[#062763]"
            >
              Add M&amp;E Indicator
            </h2>
            <form
              onSubmit={handleCreateIndicator}
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Indicator
                </label>
                <input
                  value={form.indicator}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, indicator: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Type
                </label>
                <input
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Unit of Measurement
                </label>
                <input
                  value={form.unitOfMeasurement}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      unitOfMeasurement: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Baseline Value
                </label>
                <input
                  value={form.baselineValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      baselineValue: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Target Value (at the end of the project)
                </label>
                <input
                  value={form.targetValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      targetValue: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Current Status
                </label>
                <input
                  value={form.currentStatus}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      currentStatus: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Completion Rate (%)
                </label>
                <p className="mt-1 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                  {previewCompletionRate}%
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    (current × 100 ÷ (target − baseline))
                  </span>
                </p>
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
                  Add Indicator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
