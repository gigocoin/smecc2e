import {
  buildNomineeLetterMessage,
  formatNomineeSubsistenceAllowance,
  type NomineeLetterAutoFields,
  type NomineeLetterEditableFields,
} from "./nominee-letter-shared";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Download a printable HTML copy of the signed nomination letter / agreement. */
export function downloadNomineeAgreementHtml(
  auto: NomineeLetterAutoFields,
  editable: NomineeLetterEditableFields
): void {
  const letter = buildNomineeLetterMessage(auto, editable);
  const allowance = formatNomineeSubsistenceAllowance(
    editable.subsistenceAllowance,
    editable.durationMonths
  );
  const applicantName = [auto.firstName, auto.surname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  const lines = [
    letter,
    "",
    "——— Scholarship Agreement ——–",
    `Agreement No: ${auto.applicantNo}`,
    `Holder type: ${editable.holderType || "—"}`,
    `Mobility activity: ${editable.mobilityActivity || "—"}`,
    `Mobility period: ${editable.mobilityStartDate || "[pending]"} to ${editable.mobilityEndDate || "[pending]"}`,
    `Subsistence allowance: ${allowance || "—"}`,
    `Agreement decision: ${editable.agreementDecision || "—"}`,
    "",
    "Signatures",
    `Scholarship holder: ${editable.scholarshipHolderSignature || "—"}`,
    `Date signed: ${editable.scholarshipHolderSignedDate || "—"}`,
    `Host contact: ${editable.hostContactSignature || "—"}`,
    `Date signed: ${editable.hostContactSignedDate || "—"}`,
  ];

  const body = escapeHtml(lines.join("\n")).replace(/\r?\n/g, "<br />");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SMECC2E Scholarship Agreement — ${escapeHtml(applicantName || auto.applicantNo)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 32px; color: #0f172a; line-height: 1.6; }
    h1 { font-size: 18px; color: #062763; }
    .meta { font-size: 12px; color: #475569; margin-bottom: 24px; }
    .content { font-size: 13px; }
  </style>
</head>
<body>
  <h1>SMECC2E Nomination Letter / Scholarship Agreement</h1>
  <p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p>
  <div class="content">${body}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeId = (auto.applicantNo || "agreement").replace(/[^\w.-]+/g, "_");
  anchor.href = url;
  anchor.download = `SMECC2E-Scholarship-Agreement-${safeId}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
