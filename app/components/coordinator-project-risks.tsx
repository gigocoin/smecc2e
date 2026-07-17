"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv-parse";
import {
  createRiskId,
  loadRisksFromStorage,
  risksFromCsv,
  saveRisksToStorage,
  YES_NO_OPTIONS,
  type ProjectRisk,
  type YesNoAnswer,
} from "@/lib/project-risks";

const CSV_PREVIEW_ROW_LIMIT = 5;

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const selectClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const tableInputClass =
  "w-full min-w-[10rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763]/20";

function emptyForm() {
  return {
    workPackage: "",
    riskMitigationMeasures: "",
    stateOfThePlayPeriod: "",
    appliedMitigationMeasures: "" as YesNoAnswer,
    riskMaterialised: "" as YesNoAnswer,
    stateOfThePlayComments: "",
    actions: "",
  };
}

export function CoordinatorProjectRisks({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
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
    setRisks(loadRisksFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveRisksToStorage(risks);
  }, [hydrated, risks]);

  const sortedRisks = useMemo(
    () =>
      [...risks].sort((a, b) => a.workPackage.localeCompare(b.workPackage)),
    [risks]
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

  const handleCreateRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.workPackage.trim()) {
      setCreateError("Enter the work package.");
      return;
    }

    const risk: ProjectRisk = {
      id: createRiskId(),
      workPackage: form.workPackage.trim(),
      riskMitigationMeasures: form.riskMitigationMeasures.trim(),
      stateOfThePlayPeriod: form.stateOfThePlayPeriod.trim(),
      appliedMitigationMeasures: form.appliedMitigationMeasures,
      riskMaterialised: form.riskMaterialised,
      stateOfThePlayComments: form.stateOfThePlayComments.trim(),
      actions: form.actions.trim(),
    };

    setRisks((prev) => [...prev, risk]);
    closeCreateModal();
  };

  const updateRiskField = <K extends keyof ProjectRisk>(
    id: string,
    field: K,
    value: ProjectRisk[K]
  ) => {
    setRisks((prev) =>
      prev.map((risk) => (risk.id === id ? { ...risk, [field]: value } : risk))
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
      const { risks: imported, errors } = risksFromCsv(headers, dataRows);
      if (errors.length > 0 && imported.length === 0) {
        setUploadError(errors[0] ?? "Could not import risks from CSV.");
        setUploadErrors(errors);
        return;
      }
      if (imported.length === 0) {
        setUploadError("No valid risk rows found in the CSV.");
        return;
      }
      setRisks((prev) => [...prev, ...imported]);
      setUploadCreated(imported.length);
      setUploadErrors(errors);
    } catch {
      setUploadError("Could not import risks from CSV.");
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
              Add Risks
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
            >
              Upload Risks CSV
            </button>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-[#062763]">Risks</h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {sortedRisks.length === 0
              ? "No risks yet."
              : `${sortedRisks.length} risk${sortedRisks.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Work Package</th>
                <th className="px-4 py-3">Risk Mitigation Measures</th>
                <th className="px-4 py-3">State of the Play Period</th>
                <th className="px-4 py-3">
                  Did You Apply Risk Mitigation Measures?
                </th>
                <th className="px-4 py-3">Did Your Risk Materialise?</th>
                <th className="px-4 py-3">State of the Play Comments</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!hydrated ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    Loading risks…
                  </td>
                </tr>
              ) : sortedRisks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center font-semibold text-slate-700"
                  >
                    {canManage
                      ? "No risks yet. Add one or upload a CSV to get started."
                      : "No risks yet."}
                  </td>
                </tr>
              ) : (
                sortedRisks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {risk.workPackage}
                    </td>
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      {risk.riskMitigationMeasures || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {risk.stateOfThePlayPeriod || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={risk.appliedMitigationMeasures}
                          onChange={(e) =>
                            updateRiskField(
                              risk.id,
                              "appliedMitigationMeasures",
                              e.target.value as YesNoAnswer
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#062763]"
                        >
                          <option value="">Select…</option>
                          {YES_NO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {risk.appliedMitigationMeasures || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={risk.riskMaterialised}
                          onChange={(e) =>
                            updateRiskField(
                              risk.id,
                              "riskMaterialised",
                              e.target.value as YesNoAnswer
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#062763]"
                        >
                          <option value="">Select…</option>
                          {YES_NO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {risk.riskMaterialised || "—"}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      {risk.stateOfThePlayComments || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <input
                          type="text"
                          value={risk.actions}
                          onChange={(e) =>
                            updateRiskField(risk.id, "actions", e.target.value)
                          }
                          placeholder="Enter actions…"
                          className={tableInputClass}
                        />
                      ) : (
                        <span className="font-medium text-slate-900">
                          {risk.actions || "—"}
                        </span>
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
          aria-labelledby="add-risk-title"
          onClick={closeCreateModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-risk-title"
              className="shrink-0 border-b border-slate-100 px-5 py-3 text-base font-bold text-[#062763]"
            >
              Add Risks
            </h2>
            <form
              onSubmit={handleCreateRisk}
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Work Package
                </label>
                <input
                  value={form.workPackage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workPackage: e.target.value,
                    }))
                  }
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Risk Mitigation Measures
                </label>
                <textarea
                  rows={3}
                  value={form.riskMitigationMeasures}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      riskMitigationMeasures: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  State of the Play Period
                </label>
                <input
                  value={form.stateOfThePlayPeriod}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      stateOfThePlayPeriod: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="e.g. Q1 2026"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Did You Apply Risk Mitigation Measures?
                </label>
                <select
                  value={form.appliedMitigationMeasures}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      appliedMitigationMeasures: e.target
                        .value as YesNoAnswer,
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">Select…</option>
                  {YES_NO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Did Your Risk Materialise?
                </label>
                <select
                  value={form.riskMaterialised}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      riskMaterialised: e.target.value as YesNoAnswer,
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">Select…</option>
                  {YES_NO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  State of the Play Comments
                </label>
                <textarea
                  rows={3}
                  value={form.stateOfThePlayComments}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      stateOfThePlayComments: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Actions
                </label>
                <input
                  value={form.actions}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, actions: e.target.value }))
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
                  Add Risk
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
          aria-labelledby="upload-risks-title"
          onClick={closeUploadModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="upload-risks-title"
              className="text-base font-bold text-[#062763]"
            >
              Upload Risks (CSV)
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              CSV headers supported: Work Package, Risk Mitigation Measures,
              State of the Play Period, Did You Apply Risk Mitigation Measures?,
              Did Your Risk Materialise?, State of the Play Comments, Actions
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
                Imported {uploadCreated} risk
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
