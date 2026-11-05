import { prisma } from "./prisma";
import {
  parsePhotoPublicationConsentFormData,
  validatePhotoPublicationConsentFormData,
  type PhotoPublicationConsentFormData,
} from "./photo-publication-consent-shared";
import { upsertScholarFromApplicant } from "./scholars-service";

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

export async function getPhotoPublicationConsentForApplicant(
  applicationRef: string
): Promise<PhotoPublicationConsentFormData | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(applicationRef),
    select: { photoPublicationConsentData: true },
  });
  if (!row) return null;
  return parsePhotoPublicationConsentFormData(row.photoPublicationConsentData);
}

export async function submitPhotoPublicationConsent(options: {
  applicationRef: string;
  form: unknown;
}): Promise<PhotoPublicationConsentFormData> {
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
      "Photo & publication consent can only be submitted by nominated scholars"
    );
  }

  if (existing.photoPublicationConsentSubmittedAt) {
    throw new Error("Photo & publication consent has already been submitted");
  }

  const form = validatePhotoPublicationConsentFormData(options.form);
  const submittedAt = new Date();

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      photoPublicationConsentData: form,
      photoPublicationConsentSubmittedAt: submittedAt,
    },
  });

  await upsertScholarFromApplicant(updated);

  return form;
}
