import { prisma } from "./prisma";
import {
  parseMobilityDetailsFormData,
  validateMobilityDetailsFormData,
  type MobilityDetailsFormData,
} from "./mobility-details-shared";
import { upsertScholarFromApplicant } from "./scholars-service";

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

export async function getMobilityDetailsForApplicant(
  applicationRef: string
): Promise<MobilityDetailsFormData | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(applicationRef),
    select: { mobilityDetailsData: true },
  });
  if (!row) return null;
  return parseMobilityDetailsFormData(row.mobilityDetailsData);
}

export async function submitMobilityDetails(options: {
  applicationRef: string;
  form: unknown;
}): Promise<MobilityDetailsFormData> {
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
      "Mobility details confirmation can only be submitted by nominated scholars"
    );
  }

  if (existing.mobilityDetailsSubmittedAt) {
    throw new Error("Mobility details confirmation has already been submitted");
  }

  const form = validateMobilityDetailsFormData(options.form);
  const submittedAt = new Date();

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      mobilityDetailsData: form,
      mobilityDetailsSubmittedAt: submittedAt,
    },
  });

  await upsertScholarFromApplicant(updated);

  return form;
}
