import type { ApplicationPayload, ApplicationRecord } from "./application-types";
import {
  formatNomineeSubsistenceAllowance,
  formatOptionalNomineeLetterDate,
  NOMINEE_LETTER_PENDING,
} from "./nominee-letter-shared";
import type { ApplicationDocumentField } from "./application-documents";
import { documentDisplayName } from "./application-documents";
import {
  countWords,
  isCreditSeeking,
  isCurrentlyEnrolledInDegree,
  isDegreeSeeking,
  isMastersOrPhd,
  isStaffMobilityApplicant,
  isTraineeshipApplicant,
} from "./application-mobility";

export type ApplicantDetailRow = {
  label: string;
  value: string;
  /** Uploaded file name rows */
  isDocument?: boolean;
  documentField?: ApplicationDocumentField;
  /** Multi-line essay / paragraph fields */
  isLongText?: boolean;
};

export type ApplicantDetailSection = {
  title: string;
  rows: ApplicantDetailRow[];
};

function display(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function textRow(
  label: string,
  value: string | null | undefined
): ApplicantDetailRow {
  return { label, value: display(value) };
}

function docRow(
  label: string,
  fileName: string | null | undefined,
  documentField: ApplicationDocumentField
): ApplicantDetailRow {
  const trimmed = fileName?.trim();
  return {
    label,
    value: trimmed ? documentDisplayName(trimmed) : "Not uploaded",
    isDocument: true,
    documentField,
  };
}

function longTextRow(label: string, value: string | undefined): ApplicantDetailRow {
  return {
    label,
    value: display(value),
    isLongText: true,
  };
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

function letterText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === NOMINEE_LETTER_PENDING || trimmed === "—") return "";
  return trimmed;
}

function letterDate(value: string | null | undefined): string {
  const trimmed = letterText(value);
  if (!trimmed) return "";
  const formatted = formatOptionalNomineeLetterDate(trimmed);
  return formatted === NOMINEE_LETTER_PENDING ? "" : formatted;
}

/** Award fields taken from the scholar's current nomination letter. */
export function buildNomineeLetterDetailSection(
  record: ApplicationRecord
): ApplicantDetailSection | null {
  const host = letterText(record.nomineeHostUniversity);
  const mobility = letterText(record.nomineeMobilityType);
  const area = letterText(record.nomineeAreaOfStudy);
  if (!host && !mobility && !area) return null;

  const duration = letterText(record.nomineeDurationMonths);
  const allowance = formatNomineeSubsistenceAllowance(
    record.nomineeSubsistenceAllowance ?? "",
    duration
  );
  const focal = [letterText(record.nomineeFocalPerson), letterText(record.nomineeFocalPersonEmail)]
    .filter(Boolean)
    .join(" · ");

  const rows: ApplicantDetailRow[] = [
    textRow("Host university", host),
    textRow("Type of mobility", mobility),
    textRow("Area of study / work", area),
    textRow(
      "Duration",
      duration ? (/^\d+(\.\d+)?$/.test(duration) ? `${duration} months` : duration) : ""
    ),
    textRow("Mobility start", letterDate(record.nomineeStartDate)),
    textRow("Mobility end", letterDate(record.nomineeEndDate)),
    textRow("Target group", record.nomineeTargetGroup),
    textRow("Scholarship holder", record.nomineeHolderType),
    textRow("Mobility activity", record.nomineeMobilityActivity),
    textRow("Subsistence allowance", allowance),
    textRow("Host focal person", focal),
  ].filter((row) => row.value !== "—");

  return { title: "Nomination letter", rows };
}

/** Scholar review uses the shared nomination letter for the awarded mobility. */
export function applyNomineeLetterToScholarDetails(
  record: ApplicationRecord,
  sections: ApplicantDetailSection[]
): ApplicantDetailSection[] {
  const letter = buildNomineeLetterDetailSection(record);
  const next = sections.map((section) => {
    if (!section.title.startsWith("Section A")) return section;
    return {
      ...section,
      rows: section.rows.map((row) => {
        if (row.label === "Type of mobility" && letterText(record.nomineeMobilityType)) {
          return { ...row, value: record.nomineeMobilityType!.trim() };
        }
        if (
          row.label === "Preferred host institution" &&
          letterText(record.nomineeHostUniversity)
        ) {
          return {
            ...row,
            label: "Host institution",
            value: record.nomineeHostUniversity!.trim(),
          };
        }
        if (
          row.label === "Proposed academic programme" &&
          letterText(record.nomineeAreaOfStudy)
        ) {
          return { ...row, value: record.nomineeAreaOfStudy!.trim() };
        }
        return row;
      }),
    };
  });
  return letter ? [letter, ...next] : next;
}

/** Full applicant breakdown (registration through section O) for coordinator/admin review. */
export function buildApplicantDetailSections(
  payload: ApplicationPayload,
  options?: { profileUploaded?: boolean }
): ApplicantDetailSection[] {
  const mobility = payload.typeOfMobility ?? "";
  const sections: ApplicantDetailSection[] = [];

  sections.push({
    title: "Registration (Stage 2)",
    rows: [
      textRow("Email address", payload.email),
      {
        label: "Profile picture",
        value:
          options?.profileUploaded || payload.profileUploaded
            ? "Uploaded"
            : "Not provided",
        isDocument: true,
        documentField: "profile",
      },
      textRow("Nationality", payload.nationality),
      textRow("Country of residence", payload.countryOfResidence),
      textRow("Region", payload.region),
    ],
  });

  const sectionA: ApplicantDetailRow[] = [
    textRow("Type of mobility", mobility),
    textRow("Preferred host institution", payload.preferredHostInstitution),
  ];
  if (isMastersOrPhd(mobility)) {
    sectionA.push(
      textRow("Thematic area", payload.thematicArea),
      textRow("Proposed academic programme", payload.proposedAcademicProgramme)
    );
  }
  sections.push({ title: "Section A — Mobility Category Selection", rows: sectionA });

  sections.push({
    title: "Section B — Personal Information",
    rows: [
      textRow(
        "Full name",
        [payload.surname, payload.firstName, payload.middleName]
          .filter(Boolean)
          .join(" ")
      ),
      textRow("Gender", payload.gender),
      textRow("Date of birth", payload.dateOfBirth),
      textRow("State / Province", payload.stateProvince),
      longTextRow("Home address", payload.homeAddress),
      textRow("Personal email", payload.personalEmail),
      textRow("Phone number", payload.phoneNumber),
      textRow("LinkedIn", payload.linkedinUrl),
      textRow("Other social media", payload.socialMediaUrl),
      textRow("Passport / National ID number", payload.passportOrIdNumber),
      docRow("Passport / ID document", payload.passportFileName, "passport"),
      textRow("Next of kin name", payload.nextOfKinName),
      textRow("Next of kin WhatsApp", payload.nextOfKinWhatsapp),
      textRow("Next of kin email", payload.nextOfKinEmail),
      textRow("Next of kin relationship", payload.nextOfKinRelationship),
    ],
  });

  const sectionC: ApplicantDetailRow[] = [
    textRow("Belongs to disadvantaged group", payload.belongsToDisadvantagedGroup),
  ];
  if (payload.belongsToDisadvantagedGroup === "Yes") {
    sectionC.push(
      textRow("Disadvantaged categories", formatDisadvantagedCategories(payload)),
      docRow("Supporting documents", payload.disadvantagedDocFileName, "disadvantagedDoc")
    );
  }
  sections.push({
    title: "Section C — Disability and Inclusion",
    rows: sectionC,
  });

  const sectionD: ApplicantDetailRow[] = [
    textRow("Educational qualifications", formatEducationalQualifications(payload)),
  ];
  if (payload.eduBachelor) {
    sectionD.push(
      textRow("Bachelor programme & university", payload.bachelorProgrammeUniversity),
      textRow("Bachelor CGPA", payload.bachelorCgpa)
    );
  }
  if (payload.eduMaster) {
    sectionD.push(
      textRow("Master programme & university", payload.masterProgrammeUniversity),
      textRow("Master CGPA", payload.masterCgpa)
    );
  }
  sectionD.push(
    docRow("Academic certificates", payload.academicCertificatesFileName, "academicCertificates"),
    docRow("Academic transcripts", payload.academicTranscriptsFileName, "academicTranscripts")
  );
  sections.push({ title: "Section D — Educational Background", rows: sectionD });

  if (isCreditSeeking(mobility)) {
    const sectionE: ApplicantDetailRow[] = [
      textRow("Currently enrolled in degree programme", payload.currentlyEnrolledInDegree),
    ];
    if (isCurrentlyEnrolledInDegree(payload.currentlyEnrolledInDegree)) {
      sectionE.push(
        textRow("Registration number", payload.registrationNumber),
        docRow("Proof of registration", payload.proofOfRegistrationFileName, "proofOfRegistration"),
        docRow(
          "Proof of coursework completion",
          payload.proofOfCourseworkFileName,
          "proofOfCoursework"
        )
      );
    }
    sections.push({
      title: "Section E — Current Registration Status",
      rows: sectionE,
    });
  }

  sections.push({
    title: "Section F — Academic & Professional Profile",
    rows: [
      docRow("Curriculum vitae", payload.cvFileName, "cv"),
      docRow("Publications", payload.publicationsFileName, "publications"),
      longTextRow(
        `Why applying for SMECC2E Scholarship (${countWords(payload.whyApplyingScholarship ?? "")} words)`,
        payload.whyApplyingScholarship
      ),
    ],
  });

  sections.push({
    title: "Section G — Motivation and Relevance",
    rows: [
      longTextRow(
        `Background & thematic alignment (${countWords(payload.backgroundThematicAlignment ?? "")} words)`,
        payload.backgroundThematicAlignment
      ),
      longTextRow(
        `Scholarship & career goals (${countWords(payload.scholarshipCareerGoals ?? "")} words)`,
        payload.scholarshipCareerGoals
      ),
      longTextRow(
        `Africa clean energy contribution (${countWords(payload.africaCleanEnergyContribution ?? "")} words)`,
        payload.africaCleanEnergyContribution
      ),
    ],
  });

  if (isCreditSeeking(mobility) || isDegreeSeeking(mobility)) {
    const sectionH: ApplicantDetailRow[] = [];
    if (isCreditSeeking(mobility)) {
      sectionH.push(docRow("Study / research plan", payload.studyResearchPlanFileName, "studyResearchPlan"));
    }
    if (isDegreeSeeking(mobility)) {
      sectionH.push(docRow("Research proposal", payload.researchProposalFileName, "researchProposal"));
    }
    sections.push({
      title: "Section H — Research Proposal / Study Plan",
      rows: sectionH,
    });
  }

  if (isTraineeshipApplicant(mobility)) {
    sections.push({
      title: "Section I — Traineeship Information",
      rows: [
        textRow("Preferred industry sector", payload.traineePreferredIndustrySector),
        longTextRow("Relevant skills for traineeship", payload.traineeshipRelevantSkills),
        longTextRow("Career interest area", payload.traineeshipCareerInterestArea),
        textRow("Current programme type", payload.traineeshipCurrentProgrammeType),
        textRow("Current position", payload.traineeshipCurrentPosition),
      ],
    });
  }

  if (isStaffMobilityApplicant(mobility)) {
    sections.push({
      title: "Section J — Staff Mobility",
      rows: [
        longTextRow("Organizations worked with", payload.staffOrganizationsWorkedWith),
        textRow("Current rank / position", payload.staffCurrentRankPosition),
        textRow("Years of experience", payload.staffYearsOfExperience),
        longTextRow("Purpose of staff mobility", payload.staffMobilityPurpose),
        longTextRow(
          `Proposed work plan (${countWords(payload.staffProposedWorkPlan ?? "")} words)`,
          payload.staffProposedWorkPlan
        ),
        longTextRow(
          `Expected benefits (${countWords(payload.staffExpectedBenefits ?? "")} words)`,
          payload.staffExpectedBenefits
        ),
      ],
    });
  }

  const sectionK: ApplicantDetailRow[] = [
    textRow("Language of instruction at home institution", payload.homeInstructionLanguage),
    textRow(
      "Has language proficiency certificate",
      payload.hasLanguageProficiencyCertificate
    ),
  ];
  if (payload.hasLanguageProficiencyCertificate === "Yes") {
    sectionK.push(docRow("Language certificate", payload.languageCertificateFileName, "languageCertificate"));
  }
  sections.push({ title: "Section K — Language Proficiency", rows: sectionK });

  sections.push({
    title: "Section L — References",
    rows: [
      textRow("Referee 1 — Name", payload.referee1Name),
      textRow("Referee 1 — Relationship", payload.referee1Relationship),
      textRow("Referee 1 — Position", payload.referee1Position),
      textRow("Referee 1 — Institution", payload.referee1Institution),
      textRow("Referee 1 — Email", payload.referee1Email),
      textRow("Referee 1 — Phone", payload.referee1Phone),
      textRow("Referee 2 — Name", payload.referee2Name),
      textRow("Referee 2 — Relationship", payload.referee2Relationship),
      textRow("Referee 2 — Position", payload.referee2Position),
      textRow("Referee 2 — Institution", payload.referee2Institution),
      textRow("Referee 2 — Email", payload.referee2Email),
      textRow("Referee 2 — Phone", payload.referee2Phone),
      docRow("Reference letters (merged PDF)", payload.referenceLettersFileName, "referenceLetters"),
    ],
  });

  const sectionM: ApplicantDetailRow[] = [];
  if (isDegreeSeeking(mobility)) {
    sectionM.push(
      docRow("Graduate admission application proof", payload.graduateAdmissionProofFileName, "graduateAdmissionProof")
    );
  }
  if (isStaffMobilityApplicant(mobility)) {
    sectionM.push(
      docRow("Proof of employment at partner HEI", payload.staffEmploymentProofFileName, "staffEmploymentProof"),
      docRow("Host HEI commitment / support letter", payload.staffHostCommitmentLetterFileName, "staffHostCommitmentLetter")
    );
  }
  sectionM.push(
    docRow("Declaration of medical fitness", payload.medicalFitnessDeclarationFileName, "medicalFitnessDeclaration")
  );
  sections.push({
    title: "Section M — Additional Support Documents",
    rows: sectionM,
  });

  const sectionN: ApplicantDetailRow[] = [
    textRow(
      "Previous Intra-Africa / ACP scholarship",
      payload.previousIntraAfricaScholarship
    ),
  ];
  if (payload.previousIntraAfricaScholarship === "Yes") {
    sectionN.push(
      docRow(
        "Previous scholarship declaration form",
        payload.previousScholarshipDeclarationFileName,
        "previousScholarshipDeclaration"
      )
    );
  }
  sections.push({
    title: "Section N — Previous Scholarship Declaration",
    rows: sectionN,
  });

  sections.push({
    title: "Section O — Declaration & Consent",
    rows: [
      textRow(
        "Declaration certified",
        payload.declarationCertified ? "Yes" : "No"
      ),
      textRow(
        "Data protection consent",
        payload.dataProtectionConsent ? "Yes" : "No"
      ),
      textRow("Applicant signature (typed full name)", payload.applicantSignature),
    ],
  });

  return sections;
}
