import { PrismaClient } from "@prisma/client";

const publicId = process.argv[2] ?? "APP-2026-0026";

async function main() {
  const prisma = new PrismaClient();
  try {
    const row = await prisma.applicant.findFirst({
      where: { publicId },
    });
    if (!row) {
      console.log("Applicant not found:", publicId);
      return;
    }

    const docFields = [
      "profileUploaded",
      "passportFileName",
      "disadvantagedDocFileName",
      "academicCertificatesFileName",
      "academicTranscriptsFileName",
      "proofOfRegistrationFileName",
      "proofOfCourseworkFileName",
      "cvFileName",
      "publicationsFileName",
      "studyResearchPlanFileName",
      "researchProposalFileName",
      "languageCertificateFileName",
      "referenceLettersFileName",
      "graduateAdmissionProofFileName",
      "staffEmploymentProofFileName",
      "staffHostCommitmentLetterFileName",
      "medicalFitnessDeclarationFileName",
      "previousScholarshipDeclarationFileName",
    ] as const;

    console.log({
      id: row.id,
      publicId: row.publicId,
      status: row.status,
      email: row.email,
      createdAt: row.createdAt,
      submittedAt: row.submittedAt,
    });

    for (const field of docFields) {
      const value = row[field];
      if (value) {
        console.log(`${field}:`, value);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
