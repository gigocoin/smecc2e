import { Prisma, type PreFinancingTranche } from "@prisma/client";
import { prisma } from "./prisma";
import type { FinanceRecordsView } from "./finance-coordinator-nav";

export type PreFinancingDto = {
  id: string;
  partner: string;
  universityId: string;
  financeOfficerId: string;
  financeOfficerName: string;
  reference: string;
  amount: string;
  currency: string;
  releaseDate: string;
  notes: string;
  createdAt: string;
  tranche: FinanceRecordsView;
};

export type CreatePreFinancingInput = {
  tranche: FinanceRecordsView;
  partner: string;
  financeOfficerId: string;
  reference?: string;
  amount: string;
  currency?: string;
  releaseDate: string;
  notes?: string;
  createdById?: string | null;
};

export type UpdatePreFinancingInput = {
  partner?: string;
  financeOfficerId?: string;
  amount?: string;
  currency?: string;
  releaseDate?: string;
  notes?: string;
};

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

const TRANCHE_PREFIX: Record<PreFinancingTranche, string> = {
  FIRST: "PF1",
  SECOND: "PF2",
  THIRD: "PF3",
};

function formatDateForUi(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateForDb(value: string): Date {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error("Enter a valid release date (YYYY-MM-DD).");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Enter a valid release date (YYYY-MM-DD).");
  }
  return date;
}

function parseAmount(value: string): Prisma.Decimal {
  const trimmed = value.trim();
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount greater than zero.");
  }
  return new Prisma.Decimal(trimmed);
}

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

type PreFinancingWithRelations = Prisma.PreFinancingGetPayload<{
  include: {
    university: { select: { id: true; name: true } };
    financeOfficer: { select: { id: true; publicId: true; name: true } };
  };
}>;

function mapPreFinancing(row: PreFinancingWithRelations): PreFinancingDto {
  return {
    id: row.id,
    partner: row.university.name,
    universityId: row.universityId,
    financeOfficerId: row.financeOfficer.publicId,
    financeOfficerName: row.financeOfficer.name,
    reference: row.reference,
    amount: row.amount.toString(),
    currency: row.currency,
    releaseDate: formatDateForUi(row.releaseDate),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    tranche: TRANCHE_TO_VIEW[row.tranche],
  };
}

const includeRelations = {
  university: { select: { id: true, name: true } },
  financeOfficer: { select: { id: true, publicId: true, name: true } },
} as const;

async function resolveUniversityId(partnerName: string): Promise<string> {
  const name = partnerName.trim();
  if (!name) throw new Error("Select a partner institution.");
  const university = await prisma.university.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (!university) {
    throw new Error("Select a valid partner institution.");
  }
  return university.id;
}

/** Dashboard APIs use publicId (USR-…); PreFinancing FK uses internal User.id. */
async function resolveFinanceOfficerInternalId(
  financeOfficerPublicId: string
): Promise<string> {
  const publicId = financeOfficerPublicId.trim();
  if (!publicId) throw new Error("Select a valid finance officer.");
  const officer = await prisma.user.findUnique({
    where: { publicId },
    select: { id: true, role: true, status: true },
  });
  if (!officer || officer.role !== "FINANCE_OFFICER") {
    throw new Error("Select a valid finance officer.");
  }
  if (officer.status !== "ACTIVE") {
    throw new Error("Selected finance officer is not active.");
  }
  return officer.id;
}

async function resolveUserInternalId(
  publicId: string | null | undefined
): Promise<string | null> {
  const trimmed = publicId?.trim();
  if (!trimmed) return null;
  const user = await prisma.user.findUnique({
    where: { publicId: trimmed },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function nextReference(tranche: PreFinancingTranche): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${TRANCHE_PREFIX[tranche]}-${year}-`;
  const existing = await prisma.preFinancing.findMany({
    where: {
      tranche,
      reference: { startsWith: prefix },
    },
    select: { reference: true },
  });
  const nums = existing
    .map((row) => {
      const match = row.reference.match(
        new RegExp(`^${TRANCHE_PREFIX[tranche]}-${year}-(\\d+)$`, "i")
      );
      return match ? parseInt(match[1]!, 10) : null;
    })
    .filter((value): value is number => value != null && Number.isFinite(value));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function listPreFinancings(options?: {
  tranche?: FinanceRecordsView | null;
  financeOfficerId?: string | null;
}): Promise<PreFinancingDto[]> {
  const tranche = options?.tranche
    ? VIEW_TO_TRANCHE[options.tranche]
    : undefined;
  let financeOfficerInternalId: string | undefined;
  if (options?.financeOfficerId) {
    const resolved = await resolveUserInternalId(options.financeOfficerId);
    if (!resolved) return [];
    financeOfficerInternalId = resolved;
  }
  const rows = await prisma.preFinancing.findMany({
    where: {
      ...(tranche ? { tranche } : {}),
      ...(financeOfficerInternalId
        ? { financeOfficerId: financeOfficerInternalId }
        : {}),
    },
    include: includeRelations,
    orderBy: [{ releaseDate: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapPreFinancing);
}

export async function createPreFinancing(
  input: CreatePreFinancingInput
): Promise<PreFinancingDto> {
  if (!isFinanceRecordsView(input.tranche)) {
    throw new Error("Invalid pre-financing tranche.");
  }
  const tranche = VIEW_TO_TRANCHE[input.tranche];
  const universityId = await resolveUniversityId(input.partner);
  const financeOfficerId = await resolveFinanceOfficerInternalId(
    input.financeOfficerId
  );
  const createdById = await resolveUserInternalId(input.createdById);
  const amount = parseAmount(input.amount);
  const releaseDate = parseDateForDb(input.releaseDate);
  const currency = (input.currency?.trim().toUpperCase() || "EUR").slice(0, 3);
  const notes = input.notes?.trim() ?? "";
  const reference =
    input.reference?.trim() || (await nextReference(tranche));

  try {
    const row = await prisma.preFinancing.create({
      data: {
        reference,
        tranche,
        universityId,
        financeOfficerId,
        amount,
        currency,
        releaseDate,
        notes,
        createdById,
      },
      include: includeRelations,
    });
    return mapPreFinancing(row);
  } catch (err) {
    const isUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isUnique) {
      throw new Error("A pre-financing with this reference already exists.");
    }
    throw err;
  }
}

export async function updatePreFinancing(
  id: string,
  input: UpdatePreFinancingInput
): Promise<PreFinancingDto> {
  const existing = await prisma.preFinancing.findUnique({ where: { id } });
  if (!existing) throw new Error("Pre-financing record not found.");

  const data: Prisma.PreFinancingUpdateInput = {};
  if (input.partner != null) {
    const universityId = await resolveUniversityId(input.partner);
    data.university = { connect: { id: universityId } };
  }
  if (input.financeOfficerId != null) {
    const financeOfficerId = await resolveFinanceOfficerInternalId(
      input.financeOfficerId
    );
    data.financeOfficer = { connect: { id: financeOfficerId } };
  }
  if (input.amount != null) data.amount = parseAmount(input.amount);
  if (input.currency != null) {
    data.currency = (input.currency.trim().toUpperCase() || "EUR").slice(0, 3);
  }
  if (input.releaseDate != null) {
    data.releaseDate = parseDateForDb(input.releaseDate);
  }
  if (input.notes != null) data.notes = input.notes.trim();

  const row = await prisma.preFinancing.update({
    where: { id },
    data,
    include: includeRelations,
  });
  return mapPreFinancing(row);
}

export async function deletePreFinancing(id: string): Promise<void> {
  const existing = await prisma.preFinancing.findUnique({ where: { id } });
  if (!existing) throw new Error("Pre-financing record not found.");
  await prisma.preFinancing.delete({ where: { id } });
}

export async function getReleasedTotalsByTranche(): Promise<
  Record<FinanceRecordsView, number>
> {
  const groups = await prisma.preFinancing.groupBy({
    by: ["tranche"],
    _sum: { amount: true },
  });
  const totals: Record<FinanceRecordsView, number> = {
    first_pre_financing: 0,
    second_pre_financing: 0,
    third_pre_financing: 0,
  };
  for (const group of groups) {
    const view = TRANCHE_TO_VIEW[group.tranche];
    totals[view] = Number(group._sum.amount ?? 0);
  }
  return totals;
}
