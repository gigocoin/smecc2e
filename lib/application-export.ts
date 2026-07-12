import {
  applicantDisplayName,
  applicantPrimaryEmail,
  STATUS_LABELS,
  type ApplicationRecord,
} from "./application-types";

export type ApplicantExportRow = {
  applicationNo: string;
  applicant: string;
  email: string;
  mobility: string;
  hostInstitution: string;
  programme: string;
  status: string;
  currentPage: string;
  submittedAt: string;
};

function formatSubmittedAt(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildApplicantExportRows(
  applications: ApplicationRecord[]
): ApplicantExportRow[] {
  return applications.map((app) => ({
    applicationNo: app.id,
    applicant: applicantDisplayName(app) || "",
    email: applicantPrimaryEmail(app) || "",
    mobility: app.typeOfMobility || "",
    hostInstitution: app.preferredHostInstitution || "",
    programme: app.proposedAcademicProgramme || "",
    status: STATUS_LABELS[app.status] ?? app.status,
    currentPage: app.currentPage != null ? String(app.currentPage) : "",
    submittedAt: formatSubmittedAt(app.submittedAt),
  }));
}

const EXPORT_HEADERS: { key: keyof ApplicantExportRow; label: string }[] = [
  { key: "applicationNo", label: "Application No." },
  { key: "applicant", label: "Applicant" },
  { key: "email", label: "Email" },
  { key: "mobility", label: "Mobility" },
  { key: "hostInstitution", label: "Host institution" },
  { key: "programme", label: "Programme" },
  { key: "status", label: "Status" },
  { key: "currentPage", label: "Current page" },
  { key: "submittedAt", label: "Submitted" },
];

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportFilename(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `smecc2e-applications-${stamp}.${extension}`;
}

export function downloadApplicationsExcel(
  applications: ApplicationRecord[]
): void {
  const rows = buildApplicantExportRows(applications);
  const lines = [
    EXPORT_HEADERS.map((header) => escapeCsvCell(header.label)).join(","),
    ...rows.map((row) =>
      EXPORT_HEADERS.map((header) => escapeCsvCell(row[header.key])).join(",")
    ),
  ];
  const csv = `\uFEFF${lines.join("\r\n")}`;
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    exportFilename("csv")
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadApplicationsPdf(
  applications: ApplicationRecord[]
): void {
  const rows = buildApplicantExportRows(applications);
  const tableHead = EXPORT_HEADERS.map(
    (header) => `<th>${escapeHtml(header.label)}</th>`
  ).join("");
  const tableBody = rows
    .map(
      (row) =>
        `<tr>${EXPORT_HEADERS.map(
          (header) => `<td>${escapeHtml(row[header.key])}</td>`
        ).join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SMECC2E Applications</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; color: #062763; }
    p { font-size: 12px; margin: 0 0 16px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #e8f0ff; color: #062763; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>SMECC2E Applications</h1>
  <p>${rows.length} application${rows.length === 1 ? "" : "s"} · Generated ${escapeHtml(
    new Date().toLocaleString()
  )}</p>
  <table>
    <thead><tr>${tableHead}</tr></thead>
    <tbody>${tableBody || `<tr><td colspan="${EXPORT_HEADERS.length}">No applications</td></tr>`}</tbody>
  </table>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    downloadBlob(
      new Blob([html], { type: "text/html;charset=utf-8" }),
      exportFilename("html")
    );
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
