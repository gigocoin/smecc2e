import { Prisma, type PreFinancingTranche } from "@prisma/client";
import type { FinanceRecordsView } from "./finance-coordinator-nav";
import { prisma } from "./prisma";
import type { PreFinancingReportRecord } from "./pre-financing-reports";

export type CreatePreFinancingReportInput = {
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
  /** Dashboard publicId (USR-…) of the submitting officer */
  financeOfficerPublicId: string;
};

export type UpdatePreFinancingReportInput = Omit<
  CreatePreFinancingReportInput,
  "tranche" | "financeOfficerPublicId"
>;

const VIEW_TO_TRANCHE: Record<FinanceRecordsView, PreFinancingTranche> = {
  first_pre_financing: "FIRST",
  second_pre_financing: "SECOND",
  third_pre_financing: "THIRD",
};

const TRANCHE_TO_VIEW: Record<PreFinancingTranche, FinanceRecordsView> = {
  FIRST: "first_pre_financing",
  SECOND: "second_pre_financing",
  THIRD: "third_pre_financing",
};

function isFinanceRecordsView(value: string): value is FinanceRecordsView {
  return (
    value === "first_pre_financing" ||
    value === "second_pre_financing" ||
    value === "third_pre_financing"
  );
}

export function parseFinanceRecordsViewParam(
  value: string | null | undefined
): FinanceRecordsView | null {
  if (!value) return null;
  return isFinanceRecordsView(value) ? value : null;
}

function parseEuroAmount(value: string, label: string): Prisma.Decimal {
  const trimmed = value.trim();
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a valid euro amount.`);
  }
  return new Prisma.Decimal(trimmed);
}

function parseYear(value: string): string {
  const year = value.trim();
  if (!/^\d{4}$/.test(year)) {
    throw new Error("Select a valid report year.");
  }
  return year;
}

function parseMonth(value: string): string {
  const month = value.trim().padStart(2, "0");
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Select a valid report month.");
  }
  return month;
}

function requirePdfAttachment(
  fileName: string,
  dataUrl: string,
  label: string
): { fileName: string; dataUrl: string } {
  const name = fileName.trim();
  const data = dataUrl.trim();
  if (!name || !data) {
    throw new Error(`Upload a ${label} PDF.`);
  }
  if (!data.startsWith("data:")) {
    throw new Error(`${label} file data is invalid.`);
  }
  return { fileName: name, dataUrl: data };
}

type ReportRow = {
  id: string;
  tranche: PreFinancingTranche;
  financeOfficer: { publicId: string };
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
  contributionToScholarship: Prisma.Decimal;
  contributionToInstitution: Prisma.Decimal;
  specialNeeds: Prisma.Decimal;
  createdAt: Date;
};

function mapReport(row: ReportRow): PreFinancingReportRecord {
  return {
    id: row.id,
    tranche: TRANCHE_TO_VIEW[row.tranche],
    financeOfficerId: row.financeOfficer.publicId,
    institutionName: row.institutionName,
    financeOfficerName: row.financeOfficerName,
    year: row.year,
    month: row.month,
    financialReportFileName: row.financialReportFileName,
    financialReportFileDataUrl: row.financialReportFileDataUrl,
    ledgerFileName: row.ledgerFileName,
    ledgerFileDataUrl: row.ledgerFileDataUrl,
    supportingDocumentFileName: row.supportingDocumentFileName,
    supportingDocumentFileDataUrl: row.supportingDocumentFileDataUrl,
    contributionToScholarship: row.contributionToScholarship.toString(),
    contributionToInstitution: row.contributionToInstitution.toString(),
    specialNeeds: row.specialNeeds.toString(),
    createdAt: row.createdAt.toISOString(),
  };
}

const includeOfficer = {
  financeOfficer: { select: { publicId: true } },
} as const;

async function resolveFinanceOfficerInternalId(
  publicId: string
): Promise<string> {
  const trimmed = publicId.trim();
  if (!trimmed) throw new Error("Finance officer session is required.");
  const officer = await prisma.user.findUnique({
    where: { publicId: trimmed },
    select: { id: true, role: true, status: true },
  });
  if (
    !officer ||
    (officer.role !== "FINANCE_OFFICER" && officer.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Only finance officers can submit reports.");
  }
  if (officer.status !== "ACTIVE") {
    throw new Error("Finance officer account is not active.");
  }
  return officer.id;
}

function buildReportData(input: {
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
}) {
  const financial = requirePdfAttachment(
    input.financialReportFileName,
    input.financialReportFileDataUrl,
    "financial report"
  );
  const ledger = requirePdfAttachment(
    input.ledgerFileName,
    input.ledgerFileDataUrl,
    "ledger"
  );
  const supporting = requirePdfAttachment(
    input.supportingDocumentFileName,
    input.supportingDocumentFileDataUrl,
    "supporting document"
  );
  const institutionName = input.institutionName.trim();
  const financeOfficerName = input.financeOfficerName.trim();
  if (!institutionName) throw new Error("Name of institution is required.");
  if (!financeOfficerName) {
    throw new Error("Name of finance officer is required.");
  }

  return {
    institutionName,
    financeOfficerName,
    year: parseYear(input.year),
    month: parseMonth(input.month),
    financialReportFileName: financial.fileName,
    financialReportFileDataUrl: financial.dataUrl,
    ledgerFileName: ledger.fileName,
    ledgerFileDataUrl: ledger.dataUrl,
    supportingDocumentFileName: supporting.fileName,
    supportingDocumentFileDataUrl: supporting.dataUrl,
    contributionToScholarship: parseEuroAmount(
      input.contributionToScholarship,
      "Contribution to Scholarship"
    ),
    contributionToInstitution: parseEuroAmount(
      input.contributionToInstitution,
      "Contribution to Institution"
    ),
    specialNeeds: parseEuroAmount(input.specialNeeds, "Special Needs"),
  };
}

export async function listPreFinancingReports(options?: {
  tranche?: FinanceRecordsView | null;
  financeOfficerPublicId?: string | null;
}): Promise<PreFinancingReportRecord[]> {
  const tranche = options?.tranche
    ? VIEW_TO_TRANCHE[options.tranche]
    : undefined;
  let financeOfficerId: string | undefined;
  if (options?.financeOfficerPublicId) {
    const officer = await prisma.user.findUnique({
      where: { publicId: options.financeOfficerPublicId.trim() },
      select: { id: true },
    });
    if (!officer) return [];
    financeOfficerId = officer.id;
  }

  const rows = await prisma.preFinancingReport.findMany({
    where: {
      ...(tranche ? { tranche } : {}),
      ...(financeOfficerId ? { financeOfficerId } : {}),
    },
    include: includeOfficer,
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapReport);
}

export async function createPreFinancingReport(
  input: CreatePreFinancingReportInput
): Promise<PreFinancingReportRecord> {
  if (!isFinanceRecordsView(input.tranche)) {
    throw new Error("Invalid pre-financing tranche.");
  }
  const financeOfficerId = await resolveFinanceOfficerInternalId(
    input.financeOfficerPublicId
  );
  const data = buildReportData(input);
  const row = await prisma.preFinancingReport.create({
    data: {
      tranche: VIEW_TO_TRANCHE[input.tranche],
      financeOfficerId,
      ...data,
    },
    include: includeOfficer,
  });
  return mapReport(row);
}

export async function updatePreFinancingReport(
  id: string,
  input: UpdatePreFinancingReportInput,
  options: { actorPublicId: string; actorIsCoordinator: boolean }
): Promise<PreFinancingReportRecord> {
  const existing = await prisma.preFinancingReport.findUnique({
    where: { id },
    include: includeOfficer,
  });
  if (!existing) throw new Error("Pre-financing report not found.");

  if (
    !options.actorIsCoordinator &&
    existing.financeOfficer.publicId !== options.actorPublicId
  ) {
    throw new Error("You can only edit your own reports.");
  }

  const data = buildReportData(input);
  const row = await prisma.preFinancingReport.update({
    where: { id },
    data,
    include: includeOfficer,
  });
  return mapReport(row);
}

export async function deletePreFinancingReport(
  id: string,
  options: { actorPublicId: string; actorIsCoordinator: boolean }
): Promise<void> {
  const existing = await prisma.preFinancingReport.findUnique({
    where: { id },
    include: includeOfficer,
  });
  if (!existing) throw new Error("Pre-financing report not found.");

  if (
    !options.actorIsCoordinator &&
    existing.financeOfficer.publicId !== options.actorPublicId
  ) {
    throw new Error("You can only delete your own reports.");
  }

  await prisma.preFinancingReport.delete({ where: { id } });
}
