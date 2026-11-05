import { prisma } from "./prisma";
import {
  parseScholarshipAgreementFormData,
  validateScholarshipAgreementFormData,
  type ScholarshipAgreementFormData,
} from "./scholarship-agreement-shared";
import { upsertScholarFromApplicant } from "./scholars-service";

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

export async function getScholarshipAgreementForApplicant(
  applicationRef: string
): Promise<ScholarshipAgreementFormData | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(applicationRef),
    select: { scholarshipAgreementData: true },
  });
  if (!row) return null;
  return parseScholarshipAgreementFormData(row.scholarshipAgreementData);
}

export async function submitScholarshipAgreement(options: {
  applicationRef: string;
  form: unknown;
}): Promise<ScholarshipAgreementFormData> {
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
      "Scholarship agreement can only be submitted by nominated scholars"
    );
  }

  if (existing.scholarshipAgreementSubmittedAt) {
    throw new Error("Scholarship agreement has already been submitted");
  }

  const form = validateScholarshipAgreementFormData(options.form);
  const submittedAt = new Date();

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      scholarshipAgreementData: form,
      scholarshipAgreementSubmittedAt: submittedAt,
    },
  });

  await upsertScholarFromApplicant(updated);

  return form;
}
