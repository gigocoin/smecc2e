import type { FinanceRecordsView } from "@/lib/finance-coordinator-nav";
import { FINANCE_RECORDS_VIEW_LABELS } from "@/lib/finance-coordinator-nav";

export type PreFinancingReportRecord = {
  id: string;
  tranche: FinanceRecordsView;
  financeOfficerId: string;
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

const OFFICER_KEY_PREFIX = "smecc2e.finance-officer.pre-financing-reports.";
const SHARED_ALL_KEY = "smecc2e.finance-coordinator.pre-financing-reports.all";

export function officerReportsStorageKey(
  view: FinanceRecordsView,
  officerId: string
): string {
  return `${OFFICER_KEY_PREFIX}${view}.${officerId}`;
}

function normalizeReport(
  raw: Partial<PreFinancingReportRecord>,
  fallbackOfficerId = ""
): PreFinancingReportRecord | null {
  if (!raw.id || !raw.tranche || !raw.year || !raw.month) return null;
  return {
    id: raw.id,
    tranche: raw.tranche,
    financeOfficerId: raw.financeOfficerId ?? fallbackOfficerId,
    institutionName: raw.institutionName ?? "",
    financeOfficerName: raw.financeOfficerName ?? "",
    year: raw.year,
    month: raw.month,
    financialReportFileName: raw.financialReportFileName ?? "",
    financialReportFileDataUrl: raw.financialReportFileDataUrl ?? "",
    ledgerFileName: raw.ledgerFileName ?? "",
    ledgerFileDataUrl: raw.ledgerFileDataUrl ?? "",
    supportingDocumentFileName: raw.supportingDocumentFileName ?? "",
    supportingDocumentFileDataUrl: raw.supportingDocumentFileDataUrl ?? "",
    contributionToScholarship: raw.contributionToScholarship ?? "",
    contributionToInstitution: raw.contributionToInstitution ?? "",
    specialNeeds: raw.specialNeeds ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function parseReportList(
  raw: string | null,
  fallbackOfficerId = ""
): PreFinancingReportRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<PreFinancingReportRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeReport(item, fallbackOfficerId))
      .filter((item): item is PreFinancingReportRecord => item != null);
  } catch {
    return [];
  }
}

function writeSharedReports(reports: PreFinancingReportRecord[]) {
  localStorage.setItem(SHARED_ALL_KEY, JSON.stringify(reports));
}

function readSharedReports(): PreFinancingReportRecord[] {
  return parseReportList(localStorage.getItem(SHARED_ALL_KEY));
}

function scanOfficerReportKeys(): PreFinancingReportRecord[] {
  const byId = new Map<string, PreFinancingReportRecord>();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(OFFICER_KEY_PREFIX)) continue;
    const suffix = key.slice(OFFICER_KEY_PREFIX.length);
    const officerId = suffix.includes(".")
      ? suffix.slice(suffix.indexOf(".") + 1)
      : "";
    for (const report of parseReportList(
      localStorage.getItem(key),
      officerId
    )) {
      byId.set(report.id, report);
    }
  }
  return [...byId.values()];
}

export function loadOfficerReports(
  view: FinanceRecordsView,
  officerId: string
): PreFinancingReportRecord[] {
  if (typeof window === "undefined") return [];
  return parseReportList(
    localStorage.getItem(officerReportsStorageKey(view, officerId)),
    officerId
  ).filter((report) => report.tranche === view);
}

export function saveOfficerReports(
  view: FinanceRecordsView,
  officerId: string,
  reports: PreFinancingReportRecord[]
) {
  const normalized = reports.map((report) => ({
    ...report,
    tranche: view,
    financeOfficerId: officerId,
  }));
  localStorage.setItem(
    officerReportsStorageKey(view, officerId),
    JSON.stringify(normalized)
  );

  const shared = readSharedReports().filter(
    (report) =>
      !(report.financeOfficerId === officerId && report.tranche === view)
  );
  writeSharedReports([...normalized, ...shared]);
}

function attachmentPayloadLength(report: PreFinancingReportRecord): number {
  return (
    (report.financialReportFileDataUrl?.length ?? 0) +
    (report.ledgerFileDataUrl?.length ?? 0) +
    (report.supportingDocumentFileDataUrl?.length ?? 0)
  );
}

export function loadAllPreFinancingReports(): PreFinancingReportRecord[] {
  if (typeof window === "undefined") return [];
  const shared = readSharedReports();
  const scanned = scanOfficerReportKeys();
  const byId = new Map<string, PreFinancingReportRecord>();
  for (const report of [...shared, ...scanned]) {
    const existing = byId.get(report.id);
    if (
      !existing ||
      attachmentPayloadLength(report) >= attachmentPayloadLength(existing)
    ) {
      byId.set(report.id, report);
    }
  }
  return [...byId.values()];
}

export function reportExpenseTotal(report: PreFinancingReportRecord): number {
  const parts = [
    Number(report.contributionToScholarship),
    Number(report.contributionToInstitution),
    Number(report.specialNeeds),
  ];
  return parts.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0
  );
}

export function formatReportPeriod(report: PreFinancingReportRecord): string {
  const months: Record<string, string> = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };
  const month = months[report.month.padStart(2, "0")] ?? report.month;
  return `${month} ${report.year}`;
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatEuroString(amount: string): string {
  const value = Number(amount);
  return formatEuros(Number.isFinite(value) ? value : 0);
}

export function trancheLabel(tranche: FinanceRecordsView): string {
  return FINANCE_RECORDS_VIEW_LABELS[tranche];
}

export function sortReportsByLatestDate(
  reports: PreFinancingReportRecord[]
): PreFinancingReportRecord[] {
  return [...reports].sort((a, b) => {
    const periodKey = (report: PreFinancingReportRecord) =>
      `${report.year.padStart(4, "0")}-${report.month.padStart(2, "0")}`;
    const byPeriod = periodKey(b).localeCompare(periodKey(a));
    if (byPeriod !== 0) return byPeriod;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    throw new Error("Invalid file data.");
  }
  const header = dataUrl.slice(0, commaIndex);
  const data = dataUrl.slice(commaIndex + 1);
  const mimeMatch = /^data:([^;,]+)/i.exec(header);
  const mime = mimeMatch?.[1] || "application/pdf";
  const isBase64 = /;base64/i.test(header);
  const binary = isBase64 ? atob(data) : decodeURIComponent(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

/** Create a blob object URL for previewing a stored PDF data URL. Caller must revoke it. */
export function createPdfObjectUrl(dataUrl: string): string | null {
  if (!dataUrl) return null;
  try {
    return URL.createObjectURL(dataUrlToBlob(dataUrl));
  } catch {
    return null;
  }
}

export function downloadPdfAttachment(
  dataUrl: string,
  fileName = "document.pdf"
): boolean {
  const objectUrl = createPdfObjectUrl(dataUrl);
  if (!objectUrl) return false;
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return true;
}

/** Open a stored PDF data URL in a new tab via a blob URL (more reliable than window.open(data:)). */
export function openPdfAttachment(
  dataUrl: string,
  fileName = "document.pdf"
): boolean {
  if (!dataUrl) return false;
  try {
    const objectUrl = createPdfObjectUrl(dataUrl);
    if (!objectUrl) return false;
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      downloadPdfAttachment(dataUrl, fileName);
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    return false;
  }
}
