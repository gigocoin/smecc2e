import type { ApplicationPayload, ApplicationRecord, ApplicationStatus } from "./application-types";
import {
  applicantEmailFromPayload,
  mapPrismaApplicant,
  payloadToApplicantFields,
} from "./application-mappers";
import { validateApplicationForSubmit } from "./application-validation";
import { isApplicantEmailVerifiedForSubmit } from "./email-verification-store";
import { prisma } from "./prisma";

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

async function nextApplicationPublicId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;
  const rows = await prisma.applicant.findMany({
    where: { publicId: { startsWith: prefix } },
    select: { publicId: true },
    orderBy: { publicId: "desc" },
    take: 100,
  });

  let max = 0;
  for (const row of rows) {
    if (!row.publicId) continue;
    const match = row.publicId.match(/^APP-\d{4}-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function findDraftRowByEmail(
  email: string
): Promise<Awaited<ReturnType<typeof prisma.applicant.findFirst>>> {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;

  return prisma.applicant.findFirst({
    where: {
      status: "draft",
      OR: [
        { email: { equals: norm, mode: "insensitive" } },
        { personalEmail: { equals: norm, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function findDraftByEmail(
  email: string
): Promise<ApplicationRecord | null> {
  const row = await findDraftRowByEmail(email);
  return row ? mapPrismaApplicant(row) : null;
}

export async function listApplications(options?: {
  includeDrafts?: boolean;
}): Promise<ApplicationRecord[]> {
  const includeDrafts = options?.includeDrafts ?? false;
  const rows = await prisma.applicant.findMany({
    where: includeDrafts ? undefined : { status: { not: "draft" } },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapPrismaApplicant);
}

export async function getApplication(
  id: string
): Promise<ApplicationRecord | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  return row ? mapPrismaApplicant(row) : null;
}

export async function upsertDraftApplication(
  payload: ApplicationPayload,
  currentPage: number
): Promise<ApplicationRecord> {
  const email = applicantEmailFromPayload(payload);
  if (!email) {
    throw new Error("Email is required to save application progress");
  }

  const fields = payloadToApplicantFields(payload);
  const existing = await findDraftRowByEmail(email);
  const now = new Date();

  if (existing) {
    const updated = await prisma.applicant.update({
      where: { id: existing.id },
      data: {
        ...fields,
        status: "draft",
        currentPage,
        updatedAt: now,
      },
    });
    return mapPrismaApplicant(updated);
  }

  const publicId = await nextApplicationPublicId();
  const created = await prisma.applicant.create({
    data: {
      ...fields,
      publicId,
      status: "draft",
      currentPage,
      submittedAt: now,
    },
  });
  return mapPrismaApplicant(created);
}

export async function submitApplication(
  payload: ApplicationPayload,
  existingId?: string
): Promise<ApplicationRecord> {
  const email = applicantEmailFromPayload(payload);
  if (!email) {
    throw new Error("Email is required to submit your application.");
  }
  if (!(await isApplicantEmailVerifiedForSubmit(payload))) {
    throw new Error("Please verify your email before submitting.");
  }

  const validation = validateApplicationForSubmit(payload, {
    instructionsAccepted: true,
    emailVerified: true,
  });
  if (!validation.valid) {
    const preview = validation.errors.slice(0, 8).join("; ");
    const suffix =
      validation.errors.length > 8
        ? ` (+${validation.errors.length - 8} more)`
        : "";
    throw new Error(
      `Please complete all required fields before submitting: ${preview}${suffix}`
    );
  }

  const fields = payloadToApplicantFields(payload);
  const now = new Date();

  let existing = existingId
    ? await prisma.applicant.findFirst({ where: applicantWhereByRef(existingId) })
    : null;

  if (!existing && email) {
    existing = await findDraftRowByEmail(email);
  }

  if (existing?.status === "draft") {
    const publicId = existing.publicId ?? (await nextApplicationPublicId());
    const updated = await prisma.applicant.update({
      where: { id: existing.id },
      data: {
        ...fields,
        publicId,
        status: "under_review",
        currentPage: null,
        submittedAt: now,
        updatedAt: now,
      },
    });
    return mapPrismaApplicant(updated);
  }

  const publicId = await nextApplicationPublicId();
  const created = await prisma.applicant.create({
    data: {
      ...fields,
      publicId,
      status: "under_review",
      submittedAt: now,
      currentPage: null,
    },
  });
  return mapPrismaApplicant(created);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<ApplicationRecord | null> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  if (!existing) return null;

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: { status, updatedAt: new Date() },
  });
  return mapPrismaApplicant(updated);
}
