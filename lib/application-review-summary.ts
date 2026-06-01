import type { ApplicationPayload } from "./application-types";
import {
  countWords,
  isCreditSeeking,
  isCurrentlyEnrolledInDegree,
  isDegreeSeeking,
  isMastersOrPhd,
  isStaffMobilityApplicant,
  isTraineeshipApplicant,
} from "./application-mobility";

export type ReviewSummaryRow = { label: string; value: string };

function display(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatEducationalQualifications(payload: ApplicationPayload): string {
  const parts: string[] = [];
  if (payload.eduBachelor) parts.push("Bachelor Degree");
  if (payload.eduMaster) parts.push("Master Degree");
  if (payload.eduPhd) parts.push("PhD Degree");
  return parts.join("; ") || "—";
}

function formatDisadvantagedCategories(payload: ApplicationPayload): string {
  const labels: string[] = [];
  if (payload.disadvantagedFinancially) labels.push("Financially disadvantaged background");
  if (payload.disadvantagedDisability) labels.push("Disability");
  if (payload.disadvantagedRefugee) labels.push("Refugee/displaced person");
  if (payload.disadvantagedConflict) labels.push("Conflict-affected region");
  if (payload.disadvantagedMinority) labels.push("Minority/underrepresented community");
  if (payload.disadvantagedOther) {
    labels.push(
      payload.disadvantagedOtherSpecify?.trim()
        ? `Other: ${payload.disadvantagedOtherSpecify.trim()}`
        : "Other (specify)"
    );
  }
  return labels.join("; ") || "—";
}

function formatRefereeSummary(
  name?: string,
  relationship?: string,
  institution?: string,
  email?: string
): string {
  const parts = [
    name?.trim() && `Name: ${name.trim()}`,
    relationship?.trim() && `Relationship: ${relationship.trim()}`,
    institution?.trim() && `Institution: ${institution.trim()}`,
    email?.trim() && `Email: ${email.trim()}`,
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

/** Builds stage-18 review rows for email and validation messaging. */
export function buildApplicationReviewRows(
  payload: ApplicationPayload,
  options?: { profileUploaded?: boolean }
): ReviewSummaryRow[] {
  const mobility = payload.typeOfMobility ?? "";
  const rows: ReviewSummaryRow[] = [
    { label: "Email address", value: display(payload.email) },
    {
      label: "Profile picture",
      value: options?.profileUploaded || payload.profileUploaded ? "Uploaded" : "Not provided",
    },
    { label: "Nationality", value: display(payload.nationality) },
    { label: "Country of residence", value: display(payload.countryOfResidence) },
    { label: "Region", value: display(payload.region) },
    { label: "Type of mobility", value: display(mobility) },
    { label: "Preferred host institution", value: display(payload.preferredHostInstitution) },
  ];

  if (isMastersOrPhd(mobility)) {
    rows.push(
      { label: "Thematic area", value: display(payload.thematicArea) },
      {
        label: "Proposed academic programme",
        value: display(payload.proposedAcademicProgramme),
      }
    );
  }

  rows.push(
    {
      label: "Full name",
      value: [payload.surname, payload.firstName, payload.middleName]
        .filter(Boolean)
        .join(" "),
    },
    { label: "Gender", value: display(payload.gender) },
    { label: "Date of birth", value: display(payload.dateOfBirth) },
    { label: "State/Province", value: display(payload.stateProvince) },
    { label: "Home address", value: display(payload.homeAddress) },
    { label: "Personal email", value: display(payload.personalEmail) },
    { label: "Phone number", value: display(payload.phoneNumber) },
    { label: "LinkedIn", value: display(payload.linkedinUrl) },
    { label: "Other social media", value: display(payload.socialMediaUrl) },
    { label: "Passport / National ID", value: display(payload.passportOrIdNumber) },
    {
      label: "Passport / ID document",
      value: display(payload.passportFileName, "Not uploaded"),
    },
    { label: "Next of kin", value: display(payload.nextOfKinName) },
    { label: "Next of kin WhatsApp", value: display(payload.nextOfKinWhatsapp) },
    { label: "Next of kin email", value: display(payload.nextOfKinEmail) },
    { label: "Next of kin relationship", value: display(payload.nextOfKinRelationship) },
    { label: "Disadvantaged group", value: display(payload.belongsToDisadvantagedGroup) }
  );

  if (payload.belongsToDisadvantagedGroup === "Yes") {
    rows.push(
      { label: "Disadvantaged categories", value: formatDisadvantagedCategories(payload) },
      {
        label: "Supporting documents",
        value: display(payload.disadvantagedDocFileName, "Not uploaded"),
      }
    );
  }

  rows.push({
    label: "Educational qualifications",
    value: formatEducationalQualifications(payload),
  });

  if (payload.eduBachelor) {
    rows.push(
      {
        label: "Bachelor programme & university",
        value: display(payload.bachelorProgrammeUniversity),
      },
      { label: "Bachelor CGPA", value: display(payload.bachelorCgpa) }
    );
  }
  if (payload.eduMaster) {
    rows.push(
      {
        label: "Master programme & university",
        value: display(payload.masterProgrammeUniversity),
      },
      { label: "Master CGPA", value: display(payload.masterCgpa) }
    );
  }

  rows.push(
    {
      label: "Academic certificates",
      value: display(payload.academicCertificatesFileName, "Not uploaded"),
    },
    {
      label: "Academic transcripts",
      value: display(payload.academicTranscriptsFileName, "Not uploaded"),
    }
  );

  if (isCreditSeeking(mobility)) {
    rows.push({
      label: "Currently enrolled in degree programme",
      value: display(payload.currentlyEnrolledInDegree),
    });
    if (isCurrentlyEnrolledInDegree(payload.currentlyEnrolledInDegree)) {
      rows.push(
        { label: "Registration number", value: display(payload.registrationNumber) },
        {
          label: "Proof of registration",
          value: display(payload.proofOfRegistrationFileName, "Not uploaded"),
        },
        {
          label: "Proof of coursework completion",
          value: display(payload.proofOfCourseworkFileName, "Not uploaded"),
        }
      );
    }
  }

  rows.push(
    { label: "Curriculum vitae", value: display(payload.cvFileName, "Not uploaded") },
    {
      label: "Publications",
      value: display(payload.publicationsFileName, "Not uploaded"),
    },
    {
      label: `Why applying for SMECC2E Scholarship (${countWords(payload.whyApplyingScholarship ?? "")} words)`,
      value: display(payload.whyApplyingScholarship),
    },
    {
      label: `Background & thematic area alignment (${countWords(payload.backgroundThematicAlignment ?? "")} words)`,
      value: display(payload.backgroundThematicAlignment),
    },
    {
      label: `Scholarship & academic/career goals (${countWords(payload.scholarshipCareerGoals ?? "")} words)`,
      value: display(payload.scholarshipCareerGoals),
    },
    {
      label: `Africa clean energy & climate contribution (${countWords(payload.africaCleanEnergyContribution ?? "")} words)`,
      value: display(payload.africaCleanEnergyContribution),
    }
  );

  if (isCreditSeeking(mobility)) {
    rows.push({
      label: "Study/research plan",
      value: display(payload.studyResearchPlanFileName, "Not uploaded"),
    });
  }
  if (isDegreeSeeking(mobility)) {
    rows.push({
      label: "Research proposal",
      value: display(payload.researchProposalFileName, "Not uploaded"),
    });
  }

  if (isTraineeshipApplicant(mobility)) {
    rows.push(
      { label: "Preferred industry sector", value: display(payload.traineePreferredIndustrySector) },
      { label: "Relevant skills for traineeship", value: display(payload.traineeshipRelevantSkills) },
      { label: "Career interest area", value: display(payload.traineeshipCareerInterestArea) },
      { label: "Current programme type", value: display(payload.traineeshipCurrentProgrammeType) },
      { label: "Current position", value: display(payload.traineeshipCurrentPosition) }
    );
  }

  if (isStaffMobilityApplicant(mobility)) {
    rows.push(
      { label: "Organizations worked with", value: display(payload.staffOrganizationsWorkedWith) },
      { label: "Current rank/position title", value: display(payload.staffCurrentRankPosition) },
      { label: "Years of experience", value: display(payload.staffYearsOfExperience) },
      { label: "Purpose of staff mobility", value: display(payload.staffMobilityPurpose) },
      {
        label: `Proposed work plan (${countWords(payload.staffProposedWorkPlan ?? "")} words)`,
        value: display(payload.staffProposedWorkPlan),
      },
      {
        label: `Expected benefits (${countWords(payload.staffExpectedBenefits ?? "")} words)`,
        value: display(payload.staffExpectedBenefits),
      }
    );
  }

  rows.push(
    {
      label: "Language of instruction at home institution",
      value: display(payload.homeInstructionLanguage),
    },
    {
      label: "Language proficiency certificates",
      value: display(payload.hasLanguageProficiencyCertificate),
    }
  );

  if (payload.hasLanguageProficiencyCertificate === "Yes") {
    rows.push({
      label: "Language certificate",
      value: display(payload.languageCertificateFileName, "Not uploaded"),
    });
  }

  rows.push(
    {
      label: "Referee 1",
      value: formatRefereeSummary(
        payload.referee1Name,
        payload.referee1Relationship,
        payload.referee1Institution,
        payload.referee1Email
      ),
    },
    {
      label: "Referee 2",
      value: formatRefereeSummary(
        payload.referee2Name,
        payload.referee2Relationship,
        payload.referee2Institution,
        payload.referee2Email
      ),
    },
    {
      label: "Reference letters",
      value: display(payload.referenceLettersFileName, "Not uploaded"),
    }
  );

  if (isDegreeSeeking(mobility)) {
    rows.push({
      label: "Graduate admission application proof",
      value: display(payload.graduateAdmissionProofFileName, "Not uploaded"),
    });
  }

  if (isStaffMobilityApplicant(mobility)) {
    rows.push(
      {
        label: "Proof of employment at partner HEI",
        value: display(payload.staffEmploymentProofFileName, "Not uploaded"),
      },
      {
        label: "Host HEI commitment/support letter",
        value: display(payload.staffHostCommitmentLetterFileName, "Not uploaded"),
      }
    );
  }

  rows.push(
    {
      label: "Declaration of medical fitness",
      value: display(payload.medicalFitnessDeclarationFileName, "Not uploaded"),
    },
    {
      label: "Previous Intra-Africa/ACP scholarship",
      value: display(payload.previousIntraAfricaScholarship),
    }
  );

  if (payload.previousIntraAfricaScholarship === "Yes") {
    rows.push({
      label: "Previous scholarship declaration form",
      value: display(payload.previousScholarshipDeclarationFileName, "Not uploaded"),
    });
  }

  rows.push(
    {
      label: "Declaration certified",
      value: payload.declarationCertified ? "Yes" : "No",
    },
    {
      label: "Data protection consent",
      value: payload.dataProtectionConsent ? "Yes" : "No",
    },
    { label: "Signature (typed full name)", value: display(payload.applicantSignature) }
  );

  return rows;
}
