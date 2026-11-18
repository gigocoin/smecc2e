"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { FinanceRecordsView } from "@/lib/finance-coordinator-nav";

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export type PreFinancingReportDraft = {
  id: string;
  tranche: FinanceRecordsView;
  institutionName: string;
  financeOfficerName: string;
  year: string;
  month: string;
  financialReportFileName: string;
  financialReportFileDataUrl: string;
  ledgerFileName: string;
  ledgerFileDataUrl: string;
  supportingDocumentFileName: string;
  supportingDocumentFileDataUrl: string;
  contributionToScholarship: string;
  contributionToInstitution: string;
  specialNeeds: string;
  createdAt: string;
};

type ReportFormState = {
  institutionName: string;
  financeOfficerName: string;
  year: string;
  month: string;
  financialReportFileName: string;
  financialReportFileDataUrl: string;
  ledgerFileName: string;
  ledgerFileDataUrl: string;
  supportingDocumentFileName: string;
  supportingDocumentFileDataUrl: string;
  contributionToScholarship: string;
  contributionToInstitution: string;
  specialNeeds: string;
};

type SessionProfile = {
  name: string;
  institution: string;
};

type Props = {
  open: boolean;
  tranche: FinanceRecordsView;
  trancheLabel: string;
  sessionProfile: SessionProfile | null;
  initialReport?: PreFinancingReportDraft | null;
  saving: boolean;
  onClose: () => void;
  onSave: (report: PreFinancingReportDraft) => void;
};

function isPdfFile(file: File | undefined | null): boolean {
  if (!file) return false;
  const byType = file.type === "application/pdf";
  const byName = file.name.toLowerCase().endsWith(".pdf");
  return byType || byName;
}

function yearOptions(now = new Date()): string[] {
  const current = now.getFullYear();
  return Array.from({ length: 8 }, (_, index) => String(current - index));
}

function emptyForm(profile: SessionProfile | null): ReportFormState {
  const now = new Date();
  return {
    institutionName: profile?.institution ?? "",
    financeOfficerName: profile?.name ?? "",
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    financialReportFileName: "",
    financialReportFileDataUrl: "",
    ledgerFileName: "",
    ledgerFileDataUrl: "",
    supportingDocumentFileName: "",
    supportingDocumentFileDataUrl: "",
    contributionToScholarship: "",
    contributionToInstitution: "",
    specialNeeds: "",
  };
}

function formFromReport(report: PreFinancingReportDraft): ReportFormState {
  return {
    institutionName: report.institutionName,
    financeOfficerName: report.financeOfficerName,
    year: report.year,
    month: report.month,
    financialReportFileName: report.financialReportFileName,
    financialReportFileDataUrl: report.financialReportFileDataUrl,
    ledgerFileName: report.ledgerFileName,
    ledgerFileDataUrl: report.ledgerFileDataUrl,
    supportingDocumentFileName: report.supportingDocumentFileName,
    supportingDocumentFileDataUrl: report.supportingDocumentFileDataUrl,
    contributionToScholarship: report.contributionToScholarship,
    contributionToInstitution: report.contributionToInstitution,
    specialNeeds: report.specialNeeds,
  };
}

function readPdfAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#062763]">
      {children}
    </h3>
  );
}

function EuroAmountField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-800">
        {label}
      </label>
      <div className="relative mt-1">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-[#062763]"
          aria-hidden
        >
          €
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`${inputClass} mt-0 pl-8`}
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function PdfUploadField({
  id,
  label,
  fileName,
  disabled,
  onSelect,
}: {
  id: string;
  label: string;
  fileName: string;
  disabled: boolean;
  onSelect: (
    fileName: string,
    dataUrl: string,
    error: string | null
  ) => void | Promise<void>;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled}
        className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#062763] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
        onChange={(event) => {
          const input = event.target;
          const file = input.files?.[0] ?? null;
          if (!file) {
            void onSelect("", "", null);
            return;
          }
          if (!isPdfFile(file)) {
            input.value = "";
            void onSelect("", "", "Only PDF files are allowed.");
            return;
          }
          void (async () => {
            try {
              const dataUrl = await readPdfAsDataUrl(file);
              await onSelect(file.name, dataUrl, null);
            } catch {
              input.value = "";
              await onSelect("", "", "Could not read the selected PDF.");
            }
          })();
        }}
      />
      {fileName ? (
        <p className="mt-1 text-xs font-semibold text-[#062763]">{fileName}</p>
      ) : (
        <p className="mt-1 text-xs font-medium text-slate-600">PDF only</p>
      )}
    </div>
  );
}

export function FinanceOfficerPreFinancingReportModal({
  open,
  tranche,
  trancheLabel,
  sessionProfile,
  initialReport = null,
  saving,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ReportFormState>(() =>
    emptyForm(sessionProfile)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const years = useMemo(() => yearOptions(), []);
  const isEditing = initialReport != null;

  useEffect(() => {
    if (!open) return;
    setForm(
      initialReport ? formFromReport(initialReport) : emptyForm(sessionProfile)
    );
    setFormError(null);
  }, [open, sessionProfile, initialReport]);

  if (!open) return null;

  const update = (patch: Partial<ReportFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const institutionName = form.institutionName.trim();
    const financeOfficerName = form.financeOfficerName.trim();
    const year = form.year.trim();
    const month = form.month.trim();
    const scholarship = form.contributionToScholarship.trim();
    const institution = form.contributionToInstitution.trim();
    const specialNeeds = form.specialNeeds.trim();

    if (!institutionName) {
      setFormError("Name of institution is required.");
      return;
    }
    if (!financeOfficerName) {
      setFormError("Name of finance officer is required.");
      return;
    }
    if (!year) {
      setFormError("Select a report year.");
      return;
    }
    if (!month) {
      setFormError("Select a report month.");
      return;
    }
    if (!form.financialReportFileName || !form.financialReportFileDataUrl) {
      setFormError("Upload a financial report PDF.");
      return;
    }
    if (!form.ledgerFileName || !form.ledgerFileDataUrl) {
      setFormError("Upload a ledger PDF.");
      return;
    }
    if (
      !form.supportingDocumentFileName ||
      !form.supportingDocumentFileDataUrl
    ) {
      setFormError("Upload a supporting document PDF.");
      return;
    }

    for (const [label, value] of [
      ["Contribution to Scholarship", scholarship],
      ["Contribution to Institution", institution],
      ["Special Needs", specialNeeds],
    ] as const) {
      if (value === "") {
        setFormError(`${label} amount is required.`);
        return;
      }
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) {
        setFormError(`${label} must be a valid euro amount.`);
        return;
      }
    }

    onSave({
      id: initialReport?.id ?? `PFR-${Date.now()}`,
      tranche,
      institutionName,
      financeOfficerName,
      year,
      month,
      financialReportFileName: form.financialReportFileName,
      financialReportFileDataUrl: form.financialReportFileDataUrl,
      ledgerFileName: form.ledgerFileName,
      ledgerFileDataUrl: form.ledgerFileDataUrl,
      supportingDocumentFileName: form.supportingDocumentFileName,
      supportingDocumentFileDataUrl: form.supportingDocumentFileDataUrl,
      contributionToScholarship: scholarship,
      contributionToInstitution: institution,
      specialNeeds,
      createdAt: initialReport?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pre-financing-report-title"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <h2
            id="pre-financing-report-title"
            className="text-base font-bold text-[#062763]"
          >
            {isEditing ? "Edit Pre-Financing Report" : "Pre-Financing Report"}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {isEditing
              ? `Update the report for ${trancheLabel}.`
              : `Submit a report for ${trancheLabel}.`}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5"
        >
          <section className="space-y-4">
            <SectionHeading>Finance Officer Info</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="report-institution"
                  className="block text-xs font-bold text-slate-800"
                >
                  Name of Institution
                </label>
                <input
                  id="report-institution"
                  value={form.institutionName}
                  onChange={(event) =>
                    update({ institutionName: event.target.value })
                  }
                  disabled={saving}
                  className={inputClass}
                  placeholder="Institution name"
                />
              </div>
              <div>
                <label
                  htmlFor="report-officer-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Name of Finance Officer
                </label>
                <input
                  id="report-officer-name"
                  value={form.financeOfficerName}
                  onChange={(event) =>
                    update({ financeOfficerName: event.target.value })
                  }
                  disabled={saving}
                  className={inputClass}
                  placeholder="Finance officer name"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading>Report Period</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="report-year"
                  className="block text-xs font-bold text-slate-800"
                >
                  Select Year
                </label>
                <select
                  id="report-year"
                  value={form.year}
                  onChange={(event) => update({ year: event.target.value })}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">Select year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="report-month"
                  className="block text-xs font-bold text-slate-800"
                >
                  Select Month
                </label>
                <select
                  id="report-month"
                  value={form.month}
                  onChange={(event) => update({ month: event.target.value })}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">Select month</option>
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading>Attachments</SectionHeading>
            <div className="space-y-4">
              <PdfUploadField
                id="report-financial-pdf"
                label="Financial Report Upload"
                fileName={form.financialReportFileName}
                disabled={saving}
                onSelect={(fileName, dataUrl, error) => {
                  update({
                    financialReportFileName: fileName,
                    financialReportFileDataUrl: dataUrl,
                  });
                  if (error) setFormError(error);
                }}
              />
              <PdfUploadField
                id="report-ledger-pdf"
                label="Ledger Upload"
                fileName={form.ledgerFileName}
                disabled={saving}
                onSelect={(fileName, dataUrl, error) => {
                  update({
                    ledgerFileName: fileName,
                    ledgerFileDataUrl: dataUrl,
                  });
                  if (error) setFormError(error);
                }}
              />
              <PdfUploadField
                id="report-supporting-pdf"
                label="Supporting Document Upload"
                fileName={form.supportingDocumentFileName}
                disabled={saving}
                onSelect={(fileName, dataUrl, error) => {
                  update({
                    supportingDocumentFileName: fileName,
                    supportingDocumentFileDataUrl: dataUrl,
                  });
                  if (error) setFormError(error);
                }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading>Expenditure in Euro</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="report-scholarship"
                  className="block text-xs font-bold text-slate-800"
                >
                  Contribution to Scholarship
                </label>
                <input
                  id="report-scholarship"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contributionToScholarship}
                  onChange={(event) =>
                    update({ contributionToScholarship: event.target.value })
                  }
                  disabled={saving}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label
                  htmlFor="report-institution-contrib"
                  className="block text-xs font-bold text-slate-800"
                >
                  Contribution to Institution
                </label>
                <input
                  id="report-institution-contrib"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contributionToInstitution}
                  onChange={(event) =>
                    update({ contributionToInstitution: event.target.value })
                  }
                  disabled={saving}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label
                  htmlFor="report-special-needs"
                  className="block text-xs font-bold text-slate-800"
                >
                  Special Needs
                </label>
                <input
                  id="report-special-needs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.specialNeeds}
                  onChange={(event) =>
                    update({ specialNeeds: event.target.value })
                  }
                  disabled={saving}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>
          </section>

          {formError ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
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
                : isEditing
                  ? "Save changes"
                  : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
