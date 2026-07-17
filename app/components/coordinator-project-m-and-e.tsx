"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv-parse";
import {
  clampCompletionRate,
  createMandEId,
  loadMandEFromStorage,
  mandEFromCsv,
  saveMandEToStorage,
  type ProjectMandEIndicator,
} from "@/lib/project-m-and-e";

const CSV_PREVIEW_ROW_LIMIT = 5;

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

function emptyForm() {
  return {
    indicator: "",
    type: "",
    unitOfMeasurement: "",
    baselineValue: "",
    currentStatus: "",
    completionRate: "",
  };
}

export function CoordinatorProjectMandE({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [indicators, setIndicators] = useState<ProjectMandEIndicator[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadCreated, setUploadCreated] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<{
    fileName: string;
    headers: string[];
    rows: string[][];
    totalRows: number;
  } | null>(null);
  const [csvPreviewLoading, setCsvPreviewLoading] = useState(false);
  const [csvPreviewError, setCsvPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setIndicators(loadMandEFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveMandEToStorage(indicators);
  }, [hydrated, indicators]);

  useEffect(() => {
    if (!reminderMessage) return;
    const id = window.setTimeout(() => setReminderMessage(null), 4000);
    return () => window.clearTimeout(id);
  }, [reminderMessage]);

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

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadError(null);
    setUploadCreated(0);
    setUploadErrors([]);
    setCsvPreview(null);
    setCsvPreviewLoading(false);
    setCsvPreviewError(null);
  };

  const closeUploadModal = () => {
    if (uploading) return;
    setUploadOpen(false);
    resetUploadForm();
  };

  const loadCsvPreview = useCallback(async (file: File) => {
    setCsvPreviewLoading(true);
    setCsvPreviewError(null);
    setCsvPreview(null);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      const dataRows = rows.filter((row) =>
        row.some((cell) => cell.trim() !== "")
      );
      if (!headers.length) {
        setCsvPreviewError("CSV has no header row.");
        return;
      }
      setCsvPreview({
        fileName: file.name,
        headers,
        rows: dataRows.slice(0, CSV_PREVIEW_ROW_LIMIT),
        totalRows: dataRows.length,
      });
    } catch {
      setCsvPreviewError("Could not read CSV file for preview.");
    } finally {
      setCsvPreviewLoading(false);
    }
  }, []);

  const handleCreateIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.indicator.trim()) {
      setCreateError("Enter the indicator.");
      return;
    }
    let completionRate = 0;
    if (form.completionRate.trim()) {
      const parsed = Number.parseFloat(form.completionRate);
      if (!Number.isFinite(parsed)) {
        setCreateError("Enter a valid completion rate (0–100).");
        return;
      }
      completionRate = clampCompletionRate(parsed);
    }

    const indicator: ProjectMandEIndicator = {
      id: createMandEId(),
      indicator: form.indicator.trim(),
      type: form.type.trim(),
      unitOfMeasurement: form.unitOfMeasurement.trim(),
      baselineValue: form.baselineValue.trim(),
      currentStatus: form.currentStatus.trim(),
      completionRate,
    };

    setIndicators((prev) => [...prev, indicator]);
    closeCreateModal();
  };

  const handleSendReminder = (indicator: ProjectMandEIndicator) => {
    setReminderMessage(`Reminder sent for “${indicator.indicator}”.`);
  };

  const handleUploadCsv = async () => {
    if (!uploadFile) {
      setUploadError("Select a CSV file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadCreated(0);
    setUploadErrors([]);
    try {
      const text = await uploadFile.text();
      const { headers, rows } = parseCsv(text);
      const dataRows = rows.filter((row) =>
        row.some((cell) => cell.trim() !== "")
      );
      const { indicators: imported, errors } = mandEFromCsv(headers, dataRows);
      if (errors.length > 0 && imported.length === 0) {
        setUploadError(errors[0] ?? "Could not import M&E indicators from CSV.");
        setUploadErrors(errors);
        return;
      }
      if (imported.length === 0) {
        setUploadError("No valid indicator rows found in the CSV.");
        return;
      }
      setIndicators((prev) => [...prev, ...imported]);
      setUploadCreated(imported.length);
      setUploadErrors(errors);
    } catch {
      setUploadError("Could not import M&E indicators from CSV.");
    } finally {
      setUploading(false);
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
              onClick={() => setUploadOpen(true)}
              className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
            >
              Upload M&amp;E CSV
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-[#062763]">
            Monitoring &amp; Evaluation
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {sortedIndicators.length === 0
              ? "No indicators yet."
              : `${sortedIndicators.length} indicator${
                  sortedIndicators.length === 1 ? "" : "s"
                }.`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Indicator</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Unit of Measurement</th>
                <th className="px-4 py-3">Baseline Value</th>
                <th className="px-4 py-3">Current Status</th>
                <th className="px-4 py-3">Completion Rate (%)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!hydrated ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    Loading indicators…
                  </td>
                </tr>
              ) : sortedIndicators.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    {canManage
                      ? "No indicators yet. Add one or upload a CSV to get started."
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
                      {indicator.currentStatus || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#062763]"
                            style={{ width: `${indicator.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold tabular-nums text-[#062763]">
                          {indicator.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSendReminder(indicator)}
                        className="rounded-lg border-2 border-[#062763]/25 px-3 py-1.5 text-xs font-semibold text-[#062763] transition hover:bg-[#062763]/5"
                      >
                        Send Reminder
                      </button>
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
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.completionRate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      completionRate: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
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

      {canManage && uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-m-and-e-title"
          onClick={closeUploadModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="upload-m-and-e-title"
              className="text-base font-bold text-[#062763]"
            >
              Upload M&amp;E indicators (CSV)
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              CSV headers supported: Indicator, Type, Unit of Measurement,
              Baseline Value, Current Status, Completion Rate
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-800">
                Select CSV file
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setUploadFile(file);
                  setUploadError(null);
                  setUploadCreated(0);
                  setUploadErrors([]);
                  if (file) void loadCsvPreview(file);
                  else {
                    setCsvPreview(null);
                    setCsvPreviewError(null);
                  }
                }}
                className="mt-1 block w-full text-sm font-medium text-slate-800 file:mr-3 file:rounded-lg file:border-0 file:bg-[#062763] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </div>

            {csvPreviewLoading && (
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Reading CSV preview…
              </p>
            )}
            {csvPreviewError && (
              <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
                {csvPreviewError}
              </p>
            )}
            {csvPreview && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  Preview · {csvPreview.fileName} ·{" "}
                  {csvPreview.totalRows <= CSV_PREVIEW_ROW_LIMIT
                    ? `${csvPreview.totalRows} row${csvPreview.totalRows === 1 ? "" : "s"}`
                    : `Showing first ${CSV_PREVIEW_ROW_LIMIT} of ${csvPreview.totalRows} rows`}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-[#e8f0ff] text-[#062763]">
                      <tr>
                        {csvPreview.headers.map((header) => (
                          <th key={header} className="px-3 py-2 font-bold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvPreview.rows.map((row, rowIndex) => (
                        <tr key={`${csvPreview.fileName}-${rowIndex}`}>
                          {csvPreview.headers.map((_, colIndex) => (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className="px-3 py-2 font-medium text-slate-800"
                            >
                              {row[colIndex] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {uploadCreated > 0 && (
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                Imported {uploadCreated} indicator
                {uploadCreated === 1 ? "" : "s"}.
              </p>
            )}
            {uploadError && (
              <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
                {uploadError}
              </p>
            )}
            {uploadErrors.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-5 text-xs font-semibold text-amber-900">
                {uploadErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleUploadCsv()}
                disabled={uploading || !uploadFile}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {uploading ? "Importing…" : "Import CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
