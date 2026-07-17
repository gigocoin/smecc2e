"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv-parse";
import {
  createDeliverableId,
  DELIVERABLE_STATUSES,
  deliverablesFromCsv,
  formatDeliverableDueDate,
  getDeliverableCountdown,
  isDeliverableStatus,
  loadDeliverablesFromStorage,
  saveDeliverablesToStorage,
  type DeliverableStatus,
  type ProjectDeliverable,
} from "@/lib/project-deliverables";

const CSV_PREVIEW_ROW_LIMIT = 5;

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

export function CoordinatorProjectDeliverables({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);

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
    setDeliverables(loadDeliverablesFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDeliverablesToStorage(deliverables);
  }, [hydrated, deliverables]);

  const sortedDeliverables = useMemo(
    () =>
      [...deliverables].sort((a, b) => {
        const aDue = a.dueDate || "9999-12-31";
        const bDue = b.dueDate || "9999-12-31";
        return (
          aDue.localeCompare(bDue) ||
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
    closeCreateModal();
  };

  const handleStatusChange = (id: string, status: DeliverableStatus) => {
    setDeliverables((prev) =>
      prev.map((deliverable) =>
        deliverable.id === id ? { ...deliverable, status } : deliverable
      )
    );
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
      const { deliverables: imported, errors } = deliverablesFromCsv(
        headers,
        dataRows
      );
      if (errors.length > 0 && imported.length === 0) {
        setUploadError(errors[0] ?? "Could not import deliverables from CSV.");
        setUploadErrors(errors);
        return;
      }
      if (imported.length === 0) {
        setUploadError("No valid deliverable rows found in the CSV.");
        return;
      }
      setDeliverables((prev) => [...prev, ...imported]);
      setUploadCreated(imported.length);
      setUploadErrors(errors);
    } catch {
      setUploadError("Could not import deliverables from CSV.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {canManage && (
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
            >
              Add Deliverables
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
            >
              Upload Deliverables CSV
            </button>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-[#062763]">Deliverables</h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {sortedDeliverables.length === 0
              ? "No deliverables yet."
              : `${sortedDeliverables.length} deliverable${
                  sortedDeliverables.length === 1 ? "" : "s"
                }.`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
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
              {!hydrated ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    Loading deliverables…
                  </td>
                </tr>
              ) : sortedDeliverables.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    {canManage
                      ? "No deliverables yet. Add one or upload a CSV to get started."
                      : "No deliverables yet."}
                  </td>
                </tr>
              ) : (
                sortedDeliverables.map((deliverable) => (
                  <tr key={deliverable.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {deliverable.workPackageNo || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {deliverable.deliverableNo || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {deliverable.name}
                    </td>
                    <td className="max-w-sm px-4 py-3 font-medium text-slate-900">
                      <span className="line-clamp-3">
                        {deliverable.description || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {deliverable.leadBeneficiary || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatDeliverableDueDate(deliverable.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={deliverable.status}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isDeliverableStatus(value)) {
                              handleStatusChange(deliverable.id, value);
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
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                            deliverable.status
                          )}`}
                        >
                          {deliverable.status}
                        </span>
                      )}
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

      {canManage && uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-deliverables-title"
          onClick={closeUploadModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="upload-deliverables-title"
              className="text-base font-bold text-[#062763]"
            >
              Upload deliverables (CSV)
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              CSV headers supported: Work Package No, Deliverable No,
              Deliverable Name, Description, Lead Beneficiary, Due Date, Status
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
                Imported {uploadCreated} deliverable
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
