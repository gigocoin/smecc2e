import { prisma } from "./prisma";
import {
  parsePersonalContactFormData,
  validatePersonalContactFormData,
  type PersonalContactFormData,
} from "./personal-contact-shared";
import { upsertScholarFromApplicant } from "./scholars-service";

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

export async function getPersonalContactForApplicant(
  applicationRef: string
): Promise<PersonalContactFormData | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(applicationRef),
    select: { personalContactData: true },
  });
  if (!row) return null;
  return parsePersonalContactFormData(row.personalContactData);
}

export async function submitPersonalContact(options: {
  applicationRef: string;
  form: unknown;
}): Promise<PersonalContactFormData> {
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
      "Personal contact update can only be submitted by nominated scholars"
    );
  }

  if (existing.personalContactSubmittedAt) {
    throw new Error("Personal contact update has already been submitted");
  }

  const form = validatePersonalContactFormData(options.form);
  const submittedAt = new Date();

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      personalContactData: form,
      personalContactSubmittedAt: submittedAt,
    },
  });

  await upsertScholarFromApplicant(updated);

  return form;
}
