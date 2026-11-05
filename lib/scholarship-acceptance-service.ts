import { prisma } from "./prisma";
import {
  parseScholarshipAcceptanceFormData,
  validateScholarshipAcceptanceFormData,
  type ScholarshipAcceptanceFormData,
} from "./scholarship-acceptance-shared";
import { upsertScholarFromApplicant } from "./scholars-service";

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

export async function getScholarshipAcceptanceForApplicant(
  applicationRef: string
): Promise<ScholarshipAcceptanceFormData | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(applicationRef),
    select: { scholarshipAcceptanceData: true },
  });
  if (!row) return null;
  return parseScholarshipAcceptanceFormData(row.scholarshipAcceptanceData);
}

export async function submitScholarshipAcceptance(options: {
  applicationRef: string;
  form: unknown;
}): Promise<ScholarshipAcceptanceFormData> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(options.applicationRef),
  });
  if (!existing) throw new Error("Application not found");

  if (
    existing.status !== "offered" &&
    existing.status !== "approved" &&
    existing.status !== "pre_departure" &&
    existing.status !== "reserved"
  ) {
    throw new Error(
      "Scholarship acceptance can only be submitted by nominated scholars"
    );
  }

  if (existing.scholarshipAcceptanceSubmittedAt) {
    throw new Error("Scholarship acceptance has already been submitted");
  }

  const form = validateScholarshipAcceptanceFormData(options.form);
  const submittedAt = new Date();

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      scholarshipAcceptanceData: form,
      scholarshipAcceptanceSubmittedAt: submittedAt,
      ...(form.decision === "reject" ? { status: "rejected" } : {}),
    },
  });

  if (form.decision === "reject") {
    await prisma.scholar.deleteMany({ where: { applicantId: updated.id } });
  } else {
    await upsertScholarFromApplicant(updated);
  }

  return form;
}
