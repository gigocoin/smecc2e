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

export type ApplicationSubmitContext = {
  instructionsAccepted?: boolean;
  emailVerified?: boolean;
};

function isNonEmpty(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidNumericCgpa(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

function requireField(
  errors: string[],
  condition: boolean,
  label: string
) {
  if (!condition) errors.push(label);
}

export function validateApplicationForSubmit(
  payload: ApplicationPayload,
  context: ApplicationSubmitContext = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const mobility = payload.typeOfMobility?.trim() ?? "";

  requireField(errors, context.instructionsAccepted === true, "Accept the application guidelines (page 1)");
  requireField(errors, context.emailVerified === true, "Verify your email (page 2)");
  requireField(errors, payload.profileUploaded === true, "Upload a profile picture (page 2)");

  requireField(errors, isNonEmpty(payload.email) && isValidEmail(payload.email), "Email address (page 2)");
  requireField(errors, isNonEmpty(payload.nationality), "Nationality");
  requireField(errors, isNonEmpty(payload.countryOfResidence), "Country of residence");
  requireField(errors, isNonEmpty(payload.region), "Region");
  requireField(errors, isNonEmpty(mobility), "Type of mobility");
  requireField(errors, isNonEmpty(payload.preferredHostInstitution), "Preferred host institution");

  if (isMastersOrPhd(mobility)) {
    requireField(errors, isNonEmpty(payload.thematicArea), "Thematic area");
    requireField(errors, isNonEmpty(payload.proposedAcademicProgramme), "Proposed academic programme");
  }

  requireField(errors, isNonEmpty(payload.surname), "Surname");
  requireField(errors, isNonEmpty(payload.firstName), "First name");
  requireField(errors, isNonEmpty(payload.middleName), "Middle name");
  requireField(errors, isNonEmpty(payload.gender), "Gender");
  requireField(errors, isNonEmpty(payload.dateOfBirth), "Date of birth");
  requireField(errors, isNonEmpty(payload.stateProvince), "State/Province");
  requireField(errors, isNonEmpty(payload.homeAddress), "Home address");
  requireField(errors, isNonEmpty(payload.personalEmail) && isValidEmail(payload.personalEmail), "Personal email");
  requireField(errors, isNonEmpty(payload.phoneNumber), "Phone number");
  requireField(errors, isNonEmpty(payload.linkedinUrl), "LinkedIn URL");
  requireField(errors, isNonEmpty(payload.passportOrIdNumber), "Passport / National ID number");
  requireField(errors, isNonEmpty(payload.passportFileName), "Passport / ID document upload");

  requireField(errors, isNonEmpty(payload.nextOfKinName), "Next of kin name");
  requireField(errors, isNonEmpty(payload.nextOfKinWhatsapp), "Next of kin WhatsApp");
  if (isNonEmpty(payload.nextOfKinEmail)) {
    requireField(
      errors,
      isValidEmail(payload.nextOfKinEmail ?? ""),
      "Next of kin email must be a valid email address"
    );
  }
  requireField(errors, isNonEmpty(payload.nextOfKinRelationship), "Next of kin relationship");

  requireField(errors, isNonEmpty(payload.belongsToDisadvantagedGroup), "Disadvantaged group question");

  if (payload.belongsToDisadvantagedGroup === "Yes") {
    const hasCategory =
      payload.disadvantagedFinancially ||
      payload.disadvantagedDisability ||
      payload.disadvantagedRefugee ||
      payload.disadvantagedConflict ||
      payload.disadvantagedMinority ||
      payload.disadvantagedOther;
    requireField(errors, hasCategory, "At least one disadvantaged category");
    if (payload.disadvantagedOther) {
      requireField(errors, isNonEmpty(payload.disadvantagedOtherSpecify), "Disadvantaged — other (specify)");
    }
    requireField(errors, isNonEmpty(payload.disadvantagedDocFileName), "Disadvantaged supporting documents");
  }

  const hasQualification =
    payload.eduBachelor || payload.eduMaster || payload.eduPhd;
  requireField(errors, hasQualification, "At least one educational qualification");

  if (payload.eduBachelor) {
    requireField(errors, isNonEmpty(payload.bachelorProgrammeUniversity), "Bachelor programme & university");
    requireField(
      errors,
      isNonEmpty(payload.bachelorCgpa) && isValidNumericCgpa(payload.bachelorCgpa ?? ""),
      "Bachelor CGPA (numbers only, e.g. 4.2)"
    );
  }
  if (payload.eduMaster) {
    requireField(errors, isNonEmpty(payload.masterProgrammeUniversity), "Master programme & university");
    requireField(
      errors,
      isNonEmpty(payload.masterCgpa) && isValidNumericCgpa(payload.masterCgpa ?? ""),
      "Master CGPA (numbers only, e.g. 4.2)"
    );
  }

  requireField(errors, isNonEmpty(payload.academicCertificatesFileName), "Academic certificates");
  requireField(errors, isNonEmpty(payload.academicTranscriptsFileName), "Academic transcripts");

  if (isCreditSeeking(mobility)) {
    requireField(errors, isNonEmpty(payload.currentlyEnrolledInDegree), "Currently enrolled in degree programme");
    if (isCurrentlyEnrolledInDegree(payload.currentlyEnrolledInDegree)) {
      requireField(errors, isNonEmpty(payload.registrationNumber), "Registration number");
      requireField(errors, isNonEmpty(payload.proofOfRegistrationFileName), "Proof of registration");
    }
    requireField(errors, isNonEmpty(payload.studyResearchPlanFileName), "Study/research plan");
  }

  requireField(errors, isNonEmpty(payload.cvFileName), "Curriculum vitae");
  requireField(errors, isNonEmpty(payload.whyApplyingScholarship), "Why you are applying for the scholarship");
  requireField(
    errors,
    countWords(payload.whyApplyingScholarship ?? "") > 0 &&
      countWords(payload.whyApplyingScholarship ?? "") <= 500,
    "Motivation (1–500 words)"
  );

  requireField(errors, isNonEmpty(payload.backgroundThematicAlignment), "Background & thematic alignment");
  requireField(
    errors,
    countWords(payload.backgroundThematicAlignment ?? "") > 0 &&
      countWords(payload.backgroundThematicAlignment ?? "") <= 300,
    "Background alignment (1–300 words)"
  );
  requireField(errors, isNonEmpty(payload.scholarshipCareerGoals), "Scholarship & career goals");
  requireField(
    errors,
    countWords(payload.scholarshipCareerGoals ?? "") > 0 &&
      countWords(payload.scholarshipCareerGoals ?? "") <= 300,
    "Career goals (1–300 words)"
  );
  requireField(errors, isNonEmpty(payload.africaCleanEnergyContribution), "Africa clean energy contribution");
  requireField(
    errors,
    countWords(payload.africaCleanEnergyContribution ?? "") > 0 &&
      countWords(payload.africaCleanEnergyContribution ?? "") <= 300,
    "Clean energy contribution (1–300 words)"
  );

  if (isDegreeSeeking(mobility)) {
    requireField(errors, isNonEmpty(payload.researchProposalFileName), "Research proposal");
    requireField(errors, isNonEmpty(payload.graduateAdmissionProofFileName), "Graduate admission proof");
  }

  if (isTraineeshipApplicant(mobility)) {
    requireField(errors, isNonEmpty(payload.traineePreferredIndustrySector), "Preferred industry sector");
    requireField(errors, isNonEmpty(payload.traineeshipRelevantSkills), "Relevant skills for traineeship");
    requireField(errors, isNonEmpty(payload.traineeshipCareerInterestArea), "Career interest area");
    requireField(errors, isNonEmpty(payload.traineeshipCurrentProgrammeType), "Current programme type");
    requireField(errors, isNonEmpty(payload.traineeshipCurrentPosition), "Current position");
  }

  if (isStaffMobilityApplicant(mobility)) {
    requireField(errors, isNonEmpty(payload.staffOrganizationsWorkedWith), "Organizations worked with");
    requireField(errors, isNonEmpty(payload.staffCurrentRankPosition), "Current rank/position");
    requireField(errors, isNonEmpty(payload.staffYearsOfExperience), "Years of experience");
    requireField(errors, isNonEmpty(payload.staffMobilityPurpose), "Purpose of staff mobility");
    requireField(errors, isNonEmpty(payload.staffProposedWorkPlan), "Proposed work plan");
    requireField(
      errors,
      countWords(payload.staffProposedWorkPlan ?? "") > 0 &&
        countWords(payload.staffProposedWorkPlan ?? "") <= 500,
      "Proposed work plan (1–500 words)"
    );
    requireField(errors, isNonEmpty(payload.staffExpectedBenefits), "Expected benefits");
    requireField(
      errors,
      countWords(payload.staffExpectedBenefits ?? "") > 0 &&
        countWords(payload.staffExpectedBenefits ?? "") <= 300,
      "Expected benefits (1–300 words)"
    );
    requireField(errors, isNonEmpty(payload.staffEmploymentProofFileName), "Proof of employment at partner HEI");
    requireField(errors, isNonEmpty(payload.staffHostCommitmentLetterFileName), "Host HEI commitment letter");
  }

  requireField(errors, isNonEmpty(payload.homeInstructionLanguage), "Language of instruction at home institution");
  requireField(errors, isNonEmpty(payload.hasLanguageProficiencyCertificate), "Language proficiency certificate question");
  if (payload.hasLanguageProficiencyCertificate === "Yes") {
    requireField(errors, isNonEmpty(payload.languageCertificateFileName), "Language certificate upload");
  }

  requireField(errors, isNonEmpty(payload.referee1Name), "Referee 1 name");
  requireField(errors, isNonEmpty(payload.referee1Relationship), "Referee 1 relationship");
  requireField(errors, isNonEmpty(payload.referee1Position), "Referee 1 position");
  requireField(errors, isNonEmpty(payload.referee1Institution), "Referee 1 institution");
  if (isNonEmpty(payload.referee1Email)) {
    requireField(
      errors,
      isValidEmail(payload.referee1Email ?? ""),
      "Referee 1 email must be a valid email address"
    );
  }
  requireField(errors, isNonEmpty(payload.referee1Phone), "Referee 1 phone");

  requireField(errors, isNonEmpty(payload.referee2Name), "Referee 2 name");
  requireField(errors, isNonEmpty(payload.referee2Position), "Referee 2 position");
  requireField(errors, isNonEmpty(payload.referee2Institution), "Referee 2 institution");
  if (isNonEmpty(payload.referee2Email)) {
    requireField(
      errors,
      isValidEmail(payload.referee2Email ?? ""),
      "Referee 2 email must be a valid email address"
    );
  }
  requireField(errors, isNonEmpty(payload.referee2Phone), "Referee 2 phone");

  requireField(errors, isNonEmpty(payload.referenceLettersFileName), "Reference letters");

  requireField(errors, isNonEmpty(payload.medicalFitnessDeclarationFileName), "Medical fitness declaration");

  requireField(errors, isNonEmpty(payload.previousIntraAfricaScholarship), "Previous scholarship question");
  if (payload.previousIntraAfricaScholarship === "Yes") {
    requireField(errors, isNonEmpty(payload.previousScholarshipDeclarationFileName), "Previous scholarship declaration form");
  }

  requireField(errors, payload.declarationCertified === true, "Declaration certification");
  requireField(errors, payload.dataProtectionConsent === true, "Data protection consent");
  requireField(errors, isNonEmpty(payload.applicantSignature), "Applicant signature");

  return { valid: errors.length === 0, errors };
}
