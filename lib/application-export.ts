import ExcelJS from "exceljs";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  STATUS_LABELS,
  type ApplicationPayload,
  type ApplicationRecord,
} from "./application-types";
import { averagedEvaluatorEvaluation } from "./coordinator-evaluation";
import { EVALUATION_CATEGORY_IDS } from "./evaluator-evaluation-types";

export type ApplicantExportRow = {
  applicationNo: string;
  status: string;
  currentPage: string;
  submittedAt: string;
  applicantNames: string;
  gender: string;
  email: string;
  mobilityType: string;
  nationality: string;
  countryOfResidence: string;
  preferredHostInstitution: string;
  proposedAcademicProgramme: string;
  masterProgrammeUniversity: string;
  bachelorProgrammeUniversity: string;
  linkedinUrl: string;
  belongsToDisadvantagedGroup: string;
  disadvantagedCategories: string;
  previousIntraAfricaScholarship: string;
  languageOfPreviousInstruction: string;
};

function formatSubmittedAt(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDisadvantagedCategories(payload: ApplicationPayload): string {
  const labels: string[] = [];
  if (payload.disadvantagedFinancially) {
    labels.push("Financially disadvantaged background");
  }
  if (payload.disadvantagedDisability) labels.push("Disability");
  if (payload.disadvantagedRefugee) labels.push("Refugee/displaced person");
  if (payload.disadvantagedConflict) labels.push("Conflict-affected region");
  if (payload.disadvantagedMinority) {
    labels.push("Minority/underrepresented community");
  }
  if (payload.disadvantagedOther) {
    labels.push(
      payload.disadvantagedOtherSpecify?.trim()
        ? `Other: ${payload.disadvantagedOtherSpecify.trim()}`
        : "Other (specify)"
    );
  }
  return labels.join("; ");
}

export function buildApplicantExportRows(
  applications: ApplicationRecord[]
): ApplicantExportRow[] {
  return applications.map((app) => ({
    applicationNo: app.id,
    status: STATUS_LABELS[app.status] ?? app.status,
    currentPage: app.currentPage != null ? String(app.currentPage) : "",
    submittedAt: formatSubmittedAt(app.submittedAt),
    applicantNames: applicantDisplayName(app) || "",
    gender: app.gender || "",
    email: applicantPrimaryEmail(app) || "",
    mobilityType: app.typeOfMobility || "",
    nationality: app.nationality || "",
    countryOfResidence: app.countryOfResidence || "",
    preferredHostInstitution: app.preferredHostInstitution || "",
    proposedAcademicProgramme: app.proposedAcademicProgramme || "",
    masterProgrammeUniversity: app.masterProgrammeUniversity || "",
    bachelorProgrammeUniversity: app.bachelorProgrammeUniversity || "",
    linkedinUrl: app.linkedinUrl || "",
    belongsToDisadvantagedGroup: app.belongsToDisadvantagedGroup || "",
    disadvantagedCategories: formatDisadvantagedCategories(app),
    previousIntraAfricaScholarship: app.previousIntraAfricaScholarship || "",
    languageOfPreviousInstruction: app.homeInstructionLanguage || "",
  }));
}

const EXPORT_HEADERS: { key: keyof ApplicantExportRow; label: string }[] = [
  { key: "applicationNo", label: "Application No." },
  { key: "status", label: "Status" },
  { key: "currentPage", label: "Current page" },
  { key: "submittedAt", label: "Submitted" },
  { key: "applicantNames", label: "Applicant names" },
  { key: "gender", label: "Gender" },
  { key: "email", label: "Email" },
  { key: "mobilityType", label: "Mobility type" },
  { key: "nationality", label: "Nationality" },
  { key: "countryOfResidence", label: "Country of residence" },
  { key: "preferredHostInstitution", label: "Preferred host institution" },
  { key: "proposedAcademicProgramme", label: "Proposed academic programme" },
  {
    key: "masterProgrammeUniversity",
    label: "Masters programme & university",
  },
  {
    key: "bachelorProgrammeUniversity",
    label: "Bachelor programme & university",
  },
  { key: "linkedinUrl", label: "LinkedIn" },
  {
    key: "belongsToDisadvantagedGroup",
    label: "Belongs to disadvantaged group",
  },
  { key: "disadvantagedCategories", label: "Disadvantaged categories" },
  {
    key: "previousIntraAfricaScholarship",
    label: "Previous Intra-Africa/ACP scholarship",
  },
  {
    key: "languageOfPreviousInstruction",
    label: "Language of previous instruction",
  },
];

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

function scoreCell(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Excel export for Evaluation applicants (evaluator scores and weighted averages).
 */
export async function downloadEvaluationExcel(
  applications: ApplicationRecord[]
): Promise<void> {
  const EVALUATION_WEIGHT = 0.7;
  const INTERVIEW_WEIGHT = 0.3;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMECC2E";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Evaluation", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = [
    { key: "applicationNo", label: "Application No", width: 18 },
    { key: "applicantName", label: "Applicant Name", width: 28 },
    { key: "mobilityType", label: "Mobility Type", width: 22 },
    { key: "gender", label: "Gender (Sex)", width: 14 },
    {
      key: "preferredHostInstitution",
      label: "Preferred Host Institution",
      width: 28,
    },
    {
      key: "nationality",
      label: "Nationality (Country of Origin)",
      width: 26,
    },
    { key: "evaluator1", label: "Evaluator 1", width: 22 },
    { key: "evaluator2", label: "Evaluator 2", width: 22 },
    { key: "evaluator1Score", label: "Evaluator 1 Score (100%)", width: 22 },
    { key: "evaluator2Score", label: "Evaluator 2 Score (100%)", width: 22 },
    {
      key: "absoluteDifference",
      label: "Absolute Difference in Evaluator Score",
      width: 28,
    },
    {
      key: "evaluationAveWeighted",
      label: "Evaluation Ave Score × 0.70",
      width: 26,
    },
    {
      key: "interviewScoreWeighted",
      label: "Interview Score (30%)",
      width: 20,
    },
    { key: "interviewer", label: "Assign Interviewer", width: 26 },
  ];

  sheet.columns = headers.map((header) => ({
    header: header.label,
    key: header.key,
    width: header.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF062763" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FF" },
  };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  for (const app of applications) {
    const averaged = averagedEvaluatorEvaluation(app);
    const evalWeighted =
      averaged?.grandTotal !== undefined && Number.isFinite(averaged.grandTotal)
        ? averaged.grandTotal * EVALUATION_WEIGHT
        : null;
    const interviewWeighted =
      app.interviewScore !== null &&
      app.interviewScore !== undefined &&
      Number.isFinite(app.interviewScore)
        ? app.interviewScore * INTERVIEW_WEIGHT
        : null;

    const evaluator1Score =
      app.evaluator1ReviewStatus === "evaluated"
        ? app.evaluator1EvaluationData?.grandTotal
        : undefined;
    const evaluator2Score =
      app.evaluator2ReviewStatus === "evaluated"
        ? app.evaluator2EvaluationData?.grandTotal
        : undefined;
    const absoluteDifference =
      evaluator1Score !== undefined &&
      evaluator2Score !== undefined &&
      Number.isFinite(evaluator1Score) &&
      Number.isFinite(evaluator2Score)
        ? Math.abs(evaluator1Score - evaluator2Score)
        : null;

    const excelRow = sheet.addRow({
      applicationNo: app.id,
      applicantName: applicantDisplayName(app) || "",
      mobilityType: app.typeOfMobility || "",
      gender: app.gender || "",
      preferredHostInstitution: app.preferredHostInstitution || "",
      nationality: app.nationality || "",
      evaluator1: app.evaluator1Name?.trim() || "",
      evaluator2: app.evaluator2Name?.trim() || "",
      evaluator1Score: scoreCell(evaluator1Score),
      evaluator2Score: scoreCell(evaluator2Score),
      absoluteDifference: scoreCell(absoluteDifference),
      evaluationAveWeighted: scoreCell(evalWeighted),
      interviewScoreWeighted: scoreCell(interviewWeighted),
      interviewer: app.interviewerName || "",
    });
    excelRow.alignment = { vertical: "top", wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `smecc2e-evaluation-${stamp}.xlsx`
  );
}

/**
 * Excel export for Final Evaluation applicants (criteria averages,
 * interview score, and overall score).
 */
export async function downloadFinalEvaluationExcel(
  applications: ApplicationRecord[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMECC2E";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Final Evaluation", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = [
    { key: "applicationNo", label: "Application No.", width: 18 },
    { key: "applicantName", label: "Applicant Name", width: 28 },
    { key: "status", label: "Status", width: 18 },
    { key: "mobilityType", label: "Mobility Type", width: 22 },
    ...EVALUATION_CATEGORY_IDS.map((id) => ({
      key: `criteria${id}`,
      label: `Criteria ${id}`,
      width: 12,
    })),
    { key: "evalAvgTotal", label: "Eval Avg Total", width: 14 },
    { key: "interviewScore", label: "Interview Score", width: 16 },
    { key: "overallScore", label: "Overall Score", width: 14 },
  ];

  sheet.columns = headers.map((header) => ({
    header: header.label,
    key: header.key,
    width: header.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF062763" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FF" },
  };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  for (const app of applications) {
    const averaged = averagedEvaluatorEvaluation(app);
    const evalAvg = averaged?.grandTotal;
    const interview = app.interviewScore;
    let overall: number | null = null;
    if (
      evalAvg !== undefined &&
      Number.isFinite(evalAvg) &&
      interview !== null &&
      interview !== undefined &&
      Number.isFinite(interview)
    ) {
      overall = Math.round(((evalAvg + interview) / 2) * 10) / 10;
    }

    const values: Record<string, string> = {
      applicationNo: app.id,
      applicantName: applicantDisplayName(app) || "",
      status: STATUS_LABELS[app.status] ?? app.status,
      mobilityType: app.typeOfMobility || "",
      evalAvgTotal: scoreCell(evalAvg),
      interviewScore: scoreCell(interview),
      overallScore: scoreCell(overall),
    };
    for (const categoryId of EVALUATION_CATEGORY_IDS) {
      values[`criteria${categoryId}`] = scoreCell(
        averaged?.categoryTotals[categoryId]
      );
    }

    const excelRow = sheet.addRow(values);
    excelRow.alignment = { vertical: "top", wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `smecc2e-final-evaluation-${stamp}.xlsx`
  );
}

export async function downloadApplicationsExcel(
  applications: ApplicationRecord[]
): Promise<void> {
  const rows = buildApplicantExportRows(applications);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMECC2E";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Applications", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = EXPORT_HEADERS.map((header) => ({
    header: header.label,
    key: header.key,
    width: Math.min(Math.max(header.label.length + 4, 16), 40),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF062763" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FF" },
  };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  for (const row of rows) {
    const values: Record<string, string> = {};
    for (const header of EXPORT_HEADERS) {
      values[header.key] = row[header.key];
    }
    const excelRow = sheet.addRow(values);
    excelRow.alignment = { vertical: "top", wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    exportFilename("xlsx")
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
    @page { size: landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 16px; }
    h1 { font-size: 16px; margin: 0 0 4px; color: #062763; }
    p { font-size: 11px; margin: 0 0 12px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; vertical-align: top; }
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
