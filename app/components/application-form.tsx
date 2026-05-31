"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, createContext } from "react";
import { GuidelinesPdfViewer } from "./guidelines-pdf-viewer";
import type { ApplicationRecord } from "@/lib/application-types";
import type { ApplicationDocumentField } from "@/lib/application-documents";
import { validateApplicationForSubmit } from "@/lib/application-validation";
import type { ProgramRecord, ProgramTypeLabel } from "@/lib/academic-program";
import {
  countriesFromRegions,
  regionNameForCountry,
  type RegionRecord,
} from "@/lib/regions";
import { AFRICAN_COUNTRY_OPTIONS } from "@/lib/african-countries";
import { APPLICANT_LOGIN_PATH, applicantLoginPath, applicantVerifiedLoginPath } from "@/lib/applicant-login-paths";
import { ApplicantIdleSessionGuard } from "./applicant-idle-session-guard";

const ALREADY_VERIFIED_MESSAGE =
  "The email you entered is already verified, please check your email for login details and proceed to application login.";

const ApplicationUploadContext = createContext<{
  uploadDocument: (
    field: ApplicationDocumentField,
    file: File
  ) => Promise<string>;
} | null>(null);

type ApplicationFileSelectHandler = (
  file: File,
  previewUrl: string | null,
  storedName?: string
) => void;

const DOCUMENT_FIELD_PAYLOAD_KEY: Record<
  ApplicationDocumentField,
  keyof ApplicationRecord | "profileUploaded"
> = {
  profile: "profileUploaded",
  passport: "passportFileName",
  disadvantagedDoc: "disadvantagedDocFileName",
  academicCertificates: "academicCertificatesFileName",
  academicTranscripts: "academicTranscriptsFileName",
  proofOfRegistration: "proofOfRegistrationFileName",
  proofOfCoursework: "proofOfCourseworkFileName",
  cv: "cvFileName",
  publications: "publicationsFileName",
  studyResearchPlan: "studyResearchPlanFileName",
  researchProposal: "researchProposalFileName",
  languageCertificate: "languageCertificateFileName",
  referenceLetters: "referenceLettersFileName",
  graduateAdmissionProof: "graduateAdmissionProofFileName",
  staffEmploymentProof: "staffEmploymentProofFileName",
  staffHostCommitmentLetter: "staffHostCommitmentLetterFileName",
  medicalFitnessDeclaration: "medicalFitnessDeclarationFileName",
  previousScholarshipDeclaration: "previousScholarshipDeclarationFileName",
};

async function uploadApplicationDocumentFile(
  applicationId: string,
  field: ApplicationDocumentField,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("field", field);
  const res = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/upload`,
    { method: "POST", body: formData }
  );
  const data = (await res.json()) as { storedName?: string; error?: string };
  if (!res.ok || !data.storedName) {
    throw new Error(data.error ?? "Failed to upload document");
  }
  return data.storedName;
}

const TOTAL_PAGES = 18;
const APPLICATION_ID_KEY = "smecc2e_application_id";
const APPLICATION_PAGE_KEY = "smecc2e_application_page";
import {
  APPLICATION_GUIDELINE_DOWNLOAD_NAME,
  APPLICATION_GUIDELINE_PDF,
} from "@/lib/application-guidelines";

const pageTitles: Record<number, string> = {
  1: "Instructions",
  2: "New Applicant Registration",
  3: "Section A: Mobility Category Selection",
  4: "Section B: Personal Information",
  5: "Section C: Disability and Inclusion Information",
  6: "Section D: Educational Background",
  7: "Section E: Current Registration Status",
  8: "Section F: Academic & Professional Profile",
  9: "Section G: Motivation and Relevance",
  10: "Section H: Research Proposal/Study Plan",
  11: "Section I: Traineeship Information",
  12: "Section J: Staff Mobility",
  13: "Section K: Language Proficiency",
  14: "Section L: References",
  15: "Section M: Additional Support Documents",
  16: "Section N: Previous Scholarship Declaration",
  17: "Section O: Declaration & Consent",
  18: "Review & Submit",
};

const mobilityTypes = [
  "MSc Degree-Seeking (24 Months)",
  "PhD Degree-Seeking (36 Months)",
  "MSc Credit-Seeking (6 Months)", 
  "PhD Credit-Seeking (9 Months)",
  "PhD Credit-Seeking (6 Months)",
  "Traineeship Mobility (3 Months)",
  "Staff Mobility (1 Months)",
];

const refereeRelationshipOptions = [
  "Spouse",
  "Sibling",
  "Parent",
  "Friend",
  "Colleague",
  "Neighbour",
  "Others",
];

const genderOptions = ["Female", "Male", "Prefer not to say"];

const initialForm = {
  email: "",
  nationality: "",
  countryOfResidence: "",
  region: "",
  typeOfMobility: "",
  preferredHostInstitution: "",
  proposedAcademicProgramme: "",
  thematicArea: "",
  surname: "",
  firstName: "",
  middleName: "",
  gender: "",
  dateOfBirth: "",
  stateProvince: "",
  homeAddress: "",
  personalEmail: "",
  phoneNumber: "",
  linkedinUrl: "",
  socialMediaUrl: "",
  passportOrIdNumber: "",
  nextOfKinName: "",
  nextOfKinWhatsapp: "",
  nextOfKinEmail: "",
  nextOfKinRelationship: "",
  belongsToDisadvantagedGroup: "",
  disadvantagedFinancially: false,
  disadvantagedDisability: false,
  disadvantagedRefugee: false,
  disadvantagedConflict: false,
  disadvantagedMinority: false,
  disadvantagedOther: false,
  disadvantagedOtherSpecify: "",
  eduBachelor: false,
  eduMaster: false,
  eduPhd: false,
  bachelorProgrammeUniversity: "",
  bachelorCgpa: "",
  masterProgrammeUniversity: "",
  masterCgpa: "",
  currentlyEnrolledInDegree: "",
  registrationNumber: "",
  whyApplyingScholarship: "",
  backgroundThematicAlignment: "",
  scholarshipCareerGoals: "",
  africaCleanEnergyContribution: "",
  traineePreferredIndustrySector: "",
  traineeshipRelevantSkills: "",
  traineeshipCareerInterestArea: "",
  traineeshipCurrentProgrammeType: "",
  traineeshipCurrentPosition: "",
  staffOrganizationsWorkedWith: "",
  staffCurrentRankPosition: "",
  staffYearsOfExperience: "",
  staffMobilityPurpose: "",
  staffProposedWorkPlan: "",
  staffExpectedBenefits: "",
  homeInstructionLanguage: "",
  hasLanguageProficiencyCertificate: "",
  referee1Name: "",
  referee1Relationship: "",
  referee1Position: "",
  referee1Institution: "",
  referee1Email: "",
  referee1Phone: "",
  referee2Name: "",
  referee2Relationship: "",
  referee2Position: "",
  referee2Institution: "",
  referee2Email: "",
  referee2Phone: "",
  previousIntraAfricaScholarship: "",
  declarationCertified: false,
  dataProtectionConsent: false,
  applicantSignature: "",
};

const traineeIndustrySectorOptions = [
  "Renewable Energy",
  "Transport",
  "Climate Change",
  "Environment",
  "Energy Policy",
  "Sustainable Materials",
] as const;

const disadvantagedCategoryFields = [
  { key: "disadvantagedFinancially" as const, label: "Financially disadvantaged background" },
  { key: "disadvantagedDisability" as const, label: "Disability" },
  { key: "disadvantagedRefugee" as const, label: "Refugee/displaced person" },
  { key: "disadvantagedConflict" as const, label: "Conflict-affected region" },
  { key: "disadvantagedMinority" as const, label: "Minority/underrepresented community" },
  { key: "disadvantagedOther" as const, label: "Other (specify)" },
];

const educationalQualificationFields = [
  { key: "eduBachelor" as const, label: "Bachelor Degree" },
  { key: "eduMaster" as const, label: "Master Degree" },
  { key: "eduPhd" as const, label: "PhD Degree" },
] as const;

function isMastersOrPhd(type: string) {
  return (
    type.includes("MSc Degree-Seeking") ||
    type.includes("MSc Credit-Seeking") ||
    type.includes("PhD Degree-Seeking") ||
    type.includes("PhD Credit-Seeking")
  );
}

function isCreditSeeking(type: string) {
  return (
    type.includes("MSc Credit-Seeking") || type.includes("PhD Credit-Seeking")
  );
}

function isDegreeSeeking(type: string) {
  return (
    type.includes("MSc Degree-Seeking") || type.includes("PhD Degree-Seeking")
  );
}

function isTraineeshipApplicant(type: string) {
  return type.includes("Traineeship");
}

function isStaffMobilityApplicant(type: string) {
  return type.includes("Staff Mobility");
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function programTypeFromMobility(mobility: string): ProgramTypeLabel | null {
  if (mobility.includes("PhD")) return "Doctorate";
  if (mobility.includes("MSc")) return "Master";
  return null;
}

function programsForMobilityAtHost(
  programsByHost: Record<string, ProgramRecord[]>,
  host: string,
  mobility: string
): ProgramRecord[] {
  const programs = programsByHost[host] ?? [];
  const type = programTypeFromMobility(mobility);
  if (!type) return programs;
  return programs.filter((program) => program.type === type);
}

function thematicAreasFromPrograms(programs: ProgramRecord[]): string[] {
  return [
    ...new Set(
      programs.map((program) => program.thematicArea.trim()).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function thematicAreasForHost(
  thematicAreasByHost: Record<string, string[]>,
  programsByHost: Record<string, ProgramRecord[]>,
  host: string
): string[] {
  const areas = new Set<string>();
  for (const area of thematicAreasByHost[host] ?? []) {
    const trimmed = area.trim();
    if (trimmed) areas.add(trimmed);
  }
  for (const area of thematicAreasFromPrograms(programsByHost[host] ?? [])) {
    areas.add(area);
  }
  return [...areas].sort((a, b) => a.localeCompare(b));
}

function programmeNamesForThematicArea(
  programs: ProgramRecord[],
  thematicArea: string
): string[] {
  return programs
    .filter((program) => program.thematicArea === thematicArea)
    .map((program) => program.name)
    .sort((a, b) => a.localeCompare(b));
}

export function ApplicationForm({
  portalMode = false,
}: {
  portalMode?: boolean;
}) {
  const startOnly = !portalMode;
  const visiblePageCount = portalMode ? TOTAL_PAGES : 2;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<
    string | null
  >(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState<
    boolean | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyDevLink, setVerifyDevLink] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [regionsList, setRegionsList] = useState<RegionRecord[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [hostInstitutionOptionsList, setHostInstitutionOptionsList] = useState<
    string[]
  >([]);
  const [hostInstitutionsLoading, setHostInstitutionsLoading] = useState(true);
  const [hostInstitutionsError, setHostInstitutionsError] = useState<
    string | null
  >(null);
  const [programsByHost, setProgramsByHost] = useState<
    Record<string, ProgramRecord[]>
  >({});
  const [thematicAreasByHost, setThematicAreasByHost] = useState<
    Record<string, string[]>
  >({});
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileMarkedUploaded, setProfileMarkedUploaded] = useState(false);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [passportFileName, setPassportFileName] = useState<string | null>(null);
  const [disadvantagedDocPreview, setDisadvantagedDocPreview] = useState<
    string | null
  >(null);
  const [disadvantagedDocFileName, setDisadvantagedDocFileName] = useState<
    string | null
  >(null);
  const [academicCertificatesPreview, setAcademicCertificatesPreview] =
    useState<string | null>(null);
  const [academicCertificatesFileName, setAcademicCertificatesFileName] =
    useState<string | null>(null);
  const [academicTranscriptsPreview, setAcademicTranscriptsPreview] = useState<
    string | null
  >(null);
  const [academicTranscriptsFileName, setAcademicTranscriptsFileName] = useState<
    string | null
  >(null);
  const [proofOfRegistrationPreview, setProofOfRegistrationPreview] = useState<
    string | null
  >(null);
  const [proofOfRegistrationFileName, setProofOfRegistrationFileName] =
    useState<string | null>(null);
  const [proofOfCourseworkPreview, setProofOfCourseworkPreview] = useState<
    string | null
  >(null);
  const [proofOfCourseworkFileName, setProofOfCourseworkFileName] = useState<
    string | null
  >(null);
  const [cvPreview, setCvPreview] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [publicationsPreview, setPublicationsPreview] = useState<string | null>(
    null
  );
  const [publicationsFileName, setPublicationsFileName] = useState<
    string | null
  >(null);
  const [studyResearchPlanPreview, setStudyResearchPlanPreview] = useState<
    string | null
  >(null);
  const [studyResearchPlanFileName, setStudyResearchPlanFileName] = useState<
    string | null
  >(null);
  const [researchProposalPreview, setResearchProposalPreview] = useState<
    string | null
  >(null);
  const [researchProposalFileName, setResearchProposalFileName] = useState<
    string | null
  >(null);
  const [languageCertificatePreview, setLanguageCertificatePreview] = useState<
    string | null
  >(null);
  const [languageCertificateFileName, setLanguageCertificateFileName] =
    useState<string | null>(null);
  const [referenceLettersPreview, setReferenceLettersPreview] = useState<
    string | null
  >(null);
  const [referenceLettersFileName, setReferenceLettersFileName] = useState<
    string | null
  >(null);
  const [graduateAdmissionProofPreview, setGraduateAdmissionProofPreview] =
    useState<string | null>(null);
  const [graduateAdmissionProofFileName, setGraduateAdmissionProofFileName] =
    useState<string | null>(null);
  const [staffEmploymentProofPreview, setStaffEmploymentProofPreview] = useState<
    string | null
  >(null);
  const [staffEmploymentProofFileName, setStaffEmploymentProofFileName] =
    useState<string | null>(null);
  const [staffHostCommitmentPreview, setStaffHostCommitmentPreview] = useState<
    string | null
  >(null);
  const [staffHostCommitmentLetterFileName, setStaffHostCommitmentLetterFileName] =
    useState<string | null>(null);
  const [medicalFitnessPreview, setMedicalFitnessPreview] = useState<
    string | null
  >(null);
  const [medicalFitnessDeclarationFileName, setMedicalFitnessDeclarationFileName] =
    useState<string | null>(null);
  const [previousScholarshipDeclarationPreview, setPreviousScholarshipDeclarationPreview] =
    useState<string | null>(null);
  const [previousScholarshipDeclarationFileName, setPreviousScholarshipDeclarationFileName] =
    useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftHydrationDone, setDraftHydrationDone] = useState(!portalMode);
  const portalDraftLoadStartedRef = useRef(false);
  const pendingDocumentUploadsRef = useRef(
    new Map<ApplicationDocumentField, File>()
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildApplicationPayload = useCallback(
    () => {
      const registrationEmail = form.email.trim();
      return {
        ...form,
        email: registrationEmail,
        personalEmail: registrationEmail || form.personalEmail.trim(),
        profileUploaded: profileMarkedUploaded || Boolean(profilePreview),
        passportFileName,
        disadvantagedDocFileName,
        academicCertificatesFileName,
        academicTranscriptsFileName,
        proofOfRegistrationFileName,
        proofOfCourseworkFileName,
        cvFileName,
        publicationsFileName,
        studyResearchPlanFileName,
        researchProposalFileName,
        languageCertificateFileName,
        referenceLettersFileName,
        graduateAdmissionProofFileName,
        staffEmploymentProofFileName,
        staffHostCommitmentLetterFileName,
        medicalFitnessDeclarationFileName,
        previousScholarshipDeclarationFileName,
      };
    },
    [
      form,
      profileMarkedUploaded,
      profilePreview,
      passportFileName,
      disadvantagedDocFileName,
      academicCertificatesFileName,
      academicTranscriptsFileName,
      proofOfRegistrationFileName,
      proofOfCourseworkFileName,
      cvFileName,
      publicationsFileName,
      studyResearchPlanFileName,
      researchProposalFileName,
      languageCertificateFileName,
      referenceLettersFileName,
      graduateAdmissionProofFileName,
      staffEmploymentProofFileName,
      staffHostCommitmentLetterFileName,
      medicalFitnessDeclarationFileName,
      previousScholarshipDeclarationFileName,
    ]
  );

  const submitValidation = useMemo(
    () =>
      validateApplicationForSubmit(buildApplicationPayload(), {
        instructionsAccepted,
        emailVerified,
      }),
    [
      buildApplicationPayload,
      instructionsAccepted,
      emailVerified,
    ]
  );

  const applyStoredDocumentName = useCallback(
    (field: ApplicationDocumentField, storedName: string) => {
      switch (field) {
        case "profile":
          setProfileMarkedUploaded(true);
          break;
        case "passport":
          setPassportFileName(storedName);
          break;
        case "disadvantagedDoc":
          setDisadvantagedDocFileName(storedName);
          break;
        case "academicCertificates":
          setAcademicCertificatesFileName(storedName);
          break;
        case "academicTranscripts":
          setAcademicTranscriptsFileName(storedName);
          break;
        case "proofOfRegistration":
          setProofOfRegistrationFileName(storedName);
          break;
        case "proofOfCoursework":
          setProofOfCourseworkFileName(storedName);
          break;
        case "cv":
          setCvFileName(storedName);
          break;
        case "publications":
          setPublicationsFileName(storedName);
          break;
        case "studyResearchPlan":
          setStudyResearchPlanFileName(storedName);
          break;
        case "researchProposal":
          setResearchProposalFileName(storedName);
          break;
        case "languageCertificate":
          setLanguageCertificateFileName(storedName);
          break;
        case "referenceLetters":
          setReferenceLettersFileName(storedName);
          break;
        case "graduateAdmissionProof":
          setGraduateAdmissionProofFileName(storedName);
          break;
        case "staffEmploymentProof":
          setStaffEmploymentProofFileName(storedName);
          break;
        case "staffHostCommitmentLetter":
          setStaffHostCommitmentLetterFileName(storedName);
          break;
        case "medicalFitnessDeclaration":
          setMedicalFitnessDeclarationFileName(storedName);
          break;
        case "previousScholarshipDeclaration":
          setPreviousScholarshipDeclarationFileName(storedName);
          break;
      }
    },
    []
  );

  const persistDraftToServer = useCallback(
    async (
      targetPage: number,
      extraFields?: Partial<ApplicationRecord>
    ): Promise<{
      application?: ApplicationRecord;
      error?: string;
      status?: number;
    }> => {
      const email = form.email.trim();
      if (!email) {
        return { error: "Enter your email on page 2 to save your progress." };
      }

      try {
        const res = await fetch("/api/applications/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ...buildApplicationPayload(),
            ...extraFields,
            currentPage: targetPage,
          }),
        });
        const data = (await res.json()) as {
          application?: ApplicationRecord;
          error?: string;
        };
        if (!res.ok) {
          return { error: data.error, status: res.status };
        }
        if (data.application) {
          setDraftId(data.application.id);
          localStorage.setItem(APPLICATION_ID_KEY, data.application.id);
        }
        return { application: data.application };
      } catch {
        return {
          error:
            "Could not save your progress. Check your connection and try again.",
        };
      }
    },
    [form.email, buildApplicationPayload]
  );

  const ensureApplicationId = useCallback(async (): Promise<string | null> => {
    if (draftId) {
      try {
        const res = await fetch(
          `/api/applications/${encodeURIComponent(draftId)}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        if (res.ok) {
          const data = (await res.json()) as { application?: ApplicationRecord };
          if (data.application?.status === "draft") {
            return draftId;
          }
        }
      } catch {
        /* fall through and create or find a draft */
      }
      setDraftId(null);
      localStorage.removeItem(APPLICATION_ID_KEY);
    }

    const email = form.email.trim();
    if (!email || !emailVerified) return null;

    setSavingDraft(true);
    try {
      const result = await persistDraftToServer(currentPage);
      return result.application?.id ?? null;
    } finally {
      setSavingDraft(false);
    }
  }, [draftId, form.email, emailVerified, currentPage, persistDraftToServer]);

  const flushPendingDocumentUploads = useCallback(
    async (appId: string): Promise<Partial<ApplicationRecord>> => {
      const overrides: Partial<ApplicationRecord> = {};
      const pending = pendingDocumentUploadsRef.current;

      for (const [field, file] of [...pending.entries()]) {
        const storedName = await uploadApplicationDocumentFile(appId, field, file);
        pending.delete(field);
        applyStoredDocumentName(field, storedName);

        const payloadKey = DOCUMENT_FIELD_PAYLOAD_KEY[field];
        if (payloadKey === "profileUploaded") {
          overrides.profileUploaded = true;
        } else {
          (overrides as Record<string, string>)[payloadKey] = storedName;
        }
      }

      return overrides;
    },
    [applyStoredDocumentName]
  );

  const uploadDocument = useCallback(
    async (field: ApplicationDocumentField, file: File): Promise<string> => {
      const appId = await ensureApplicationId();
      if (!appId) {
        pendingDocumentUploadsRef.current.set(field, file);
        return file.name;
      }

      const storedName = await uploadApplicationDocumentFile(appId, field, file);
      pendingDocumentUploadsRef.current.delete(field);
      applyStoredDocumentName(field, storedName);
      return storedName;
    },
    [ensureApplicationId, applyStoredDocumentName]
  );

  const uploadContextValue = useMemo(
    () => ({ uploadDocument }),
    [uploadDocument]
  );

  const applyDraftToForm = useCallback((draft: ApplicationRecord) => {
    setDraftId(draft.id);
    localStorage.setItem(APPLICATION_ID_KEY, draft.id);
    setForm({
      email: draft.email ?? "",
      nationality: draft.nationality ?? "",
      countryOfResidence: draft.countryOfResidence ?? "",
      region: draft.region ?? "",
      typeOfMobility: draft.typeOfMobility ?? "",
      preferredHostInstitution: draft.preferredHostInstitution ?? "",
      proposedAcademicProgramme: draft.proposedAcademicProgramme ?? "",
      thematicArea: draft.thematicArea ?? "",
      surname: draft.surname ?? "",
      firstName: draft.firstName ?? "",
      middleName: draft.middleName ?? "",
      gender: draft.gender ?? "",
      dateOfBirth: draft.dateOfBirth ?? "",
      stateProvince: draft.stateProvince ?? "",
      homeAddress: draft.homeAddress ?? "",
      personalEmail: draft.personalEmail ?? "",
      phoneNumber: draft.phoneNumber ?? "",
      linkedinUrl: draft.linkedinUrl ?? "",
      socialMediaUrl: draft.socialMediaUrl ?? "",
      passportOrIdNumber: draft.passportOrIdNumber ?? "",
      nextOfKinName: draft.nextOfKinName ?? "",
      nextOfKinWhatsapp: draft.nextOfKinWhatsapp ?? "",
      nextOfKinEmail: draft.nextOfKinEmail ?? "",
      nextOfKinRelationship: draft.nextOfKinRelationship ?? "",
      belongsToDisadvantagedGroup: draft.belongsToDisadvantagedGroup ?? "",
      disadvantagedFinancially: draft.disadvantagedFinancially ?? false,
      disadvantagedDisability: draft.disadvantagedDisability ?? false,
      disadvantagedRefugee: draft.disadvantagedRefugee ?? false,
      disadvantagedConflict: draft.disadvantagedConflict ?? false,
      disadvantagedMinority: draft.disadvantagedMinority ?? false,
      disadvantagedOther: draft.disadvantagedOther ?? false,
      disadvantagedOtherSpecify: draft.disadvantagedOtherSpecify ?? "",
      eduBachelor: draft.eduBachelor ?? false,
      eduMaster: draft.eduMaster ?? false,
      eduPhd: draft.eduPhd ?? false,
      bachelorProgrammeUniversity: draft.bachelorProgrammeUniversity ?? "",
      bachelorCgpa: draft.bachelorCgpa ?? "",
      masterProgrammeUniversity: draft.masterProgrammeUniversity ?? "",
      masterCgpa: draft.masterCgpa ?? "",
      currentlyEnrolledInDegree: draft.currentlyEnrolledInDegree ?? "",
      registrationNumber: draft.registrationNumber ?? "",
      whyApplyingScholarship: draft.whyApplyingScholarship ?? "",
      backgroundThematicAlignment: draft.backgroundThematicAlignment ?? "",
      scholarshipCareerGoals: draft.scholarshipCareerGoals ?? "",
      africaCleanEnergyContribution: draft.africaCleanEnergyContribution ?? "",
      traineePreferredIndustrySector: draft.traineePreferredIndustrySector ?? "",
      traineeshipRelevantSkills: draft.traineeshipRelevantSkills ?? "",
      traineeshipCareerInterestArea: draft.traineeshipCareerInterestArea ?? "",
      traineeshipCurrentProgrammeType:
        draft.traineeshipCurrentProgrammeType ?? "",
      traineeshipCurrentPosition: draft.traineeshipCurrentPosition ?? "",
      staffOrganizationsWorkedWith: draft.staffOrganizationsWorkedWith ?? "",
      staffCurrentRankPosition: draft.staffCurrentRankPosition ?? "",
      staffYearsOfExperience: draft.staffYearsOfExperience ?? "",
      staffMobilityPurpose: draft.staffMobilityPurpose ?? "",
      staffProposedWorkPlan: draft.staffProposedWorkPlan ?? "",
      staffExpectedBenefits: draft.staffExpectedBenefits ?? "",
      homeInstructionLanguage: draft.homeInstructionLanguage ?? "",
      hasLanguageProficiencyCertificate:
        draft.hasLanguageProficiencyCertificate ?? "",
      referee1Name: draft.referee1Name ?? "",
      referee1Relationship: draft.referee1Relationship ?? "",
      referee1Position: draft.referee1Position ?? "",
      referee1Institution: draft.referee1Institution ?? "",
      referee1Email: draft.referee1Email ?? "",
      referee1Phone: draft.referee1Phone ?? "",
      referee2Name: draft.referee2Name ?? "",
      referee2Relationship: draft.referee2Relationship ?? "",
      referee2Position: draft.referee2Position ?? "",
      referee2Institution: draft.referee2Institution ?? "",
      referee2Email: draft.referee2Email ?? "",
      referee2Phone: draft.referee2Phone ?? "",
      previousIntraAfricaScholarship:
        draft.previousIntraAfricaScholarship ?? "",
      declarationCertified: draft.declarationCertified ?? false,
      dataProtectionConsent: draft.dataProtectionConsent ?? false,
      applicantSignature: draft.applicantSignature ?? "",
    });
    if (draft.profileUploaded) {
      setProfileMarkedUploaded(true);
    }
    if (draft.passportFileName) {
      setPassportFileName(draft.passportFileName);
    }
    if (draft.disadvantagedDocFileName) {
      setDisadvantagedDocFileName(draft.disadvantagedDocFileName);
    }
    if (draft.academicCertificatesFileName) {
      setAcademicCertificatesFileName(draft.academicCertificatesFileName);
    }
    if (draft.academicTranscriptsFileName) {
      setAcademicTranscriptsFileName(draft.academicTranscriptsFileName);
    }
    if (draft.proofOfRegistrationFileName) {
      setProofOfRegistrationFileName(draft.proofOfRegistrationFileName);
    }
    if (draft.proofOfCourseworkFileName) {
      setProofOfCourseworkFileName(draft.proofOfCourseworkFileName);
    }
    if (draft.cvFileName) {
      setCvFileName(draft.cvFileName);
    }
    if (draft.publicationsFileName) {
      setPublicationsFileName(draft.publicationsFileName);
    }
    if (draft.studyResearchPlanFileName) {
      setStudyResearchPlanFileName(draft.studyResearchPlanFileName);
    }
    if (draft.researchProposalFileName) {
      setResearchProposalFileName(draft.researchProposalFileName);
    }
    if (draft.languageCertificateFileName) {
      setLanguageCertificateFileName(draft.languageCertificateFileName);
    }
    if (draft.referenceLettersFileName) {
      setReferenceLettersFileName(draft.referenceLettersFileName);
    }
    if (draft.graduateAdmissionProofFileName) {
      setGraduateAdmissionProofFileName(draft.graduateAdmissionProofFileName);
    }
    if (draft.staffEmploymentProofFileName) {
      setStaffEmploymentProofFileName(draft.staffEmploymentProofFileName);
    }
    if (draft.staffHostCommitmentLetterFileName) {
      setStaffHostCommitmentLetterFileName(draft.staffHostCommitmentLetterFileName);
    }
    if (draft.medicalFitnessDeclarationFileName) {
      setMedicalFitnessDeclarationFileName(draft.medicalFitnessDeclarationFileName);
    }
    if (draft.previousScholarshipDeclarationFileName) {
      setPreviousScholarshipDeclarationFileName(
        draft.previousScholarshipDeclarationFileName
      );
    }
    if (draft.currentPage && draft.currentPage >= 2) {
      setInstructionsAccepted(true);
      localStorage.setItem("smecc2e_instructions", "1");
      localStorage.setItem(APPLICATION_PAGE_KEY, String(draft.currentPage));
      if (draft.currentPage <= TOTAL_PAGES) {
        setCurrentPage(draft.currentPage);
      }
    }
  }, []);

  const nationalityCountryOptions = useMemo(
    () => countriesFromRegions(regionsList),
    [regionsList]
  );

  const residenceCountryOptions = useMemo(
    () => [...AFRICAN_COUNTRY_OPTIONS],
    []
  );

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "email") {
      setEmailVerified(false);
      setVerifyDevLink(null);
      setVerifyMessage(null);
      setVerifyError(null);
    }
  };

  const handleNationalityChange = (country: string) => {
    setForm((prev) => ({
      ...prev,
      nationality: country,
      region: regionNameForCountry(regionsList, country),
    }));
  };

  const handleCountryOfResidenceChange = (country: string) => {
    setForm((prev) => ({
      ...prev,
      countryOfResidence: country,
    }));
  };

  const checkEmailVerified = useCallback(async (email: string) => {
    if (!email.trim()) {
      setEmailVerified(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/verify-email/status?email=${encodeURIComponent(email.trim())}`
      );
      const data = (await res.json()) as { verified?: boolean; error?: string };
      setEmailVerified(Boolean(data.verified));
    } catch {
      setEmailVerified(false);
    }
  }, []);

  useEffect(() => {
    const freshStart = startOnly && searchParams.get("fresh") === "1";

    if (freshStart) {
      localStorage.removeItem(APPLICATION_PAGE_KEY);
      localStorage.removeItem("smecc2e_instructions");
      setInstructionsAccepted(false);
      setCurrentPage(1);
      setIsHydrated(true);
      router.replace("/application?page=1", { scroll: false });
      return;
    }

    if (localStorage.getItem("smecc2e_instructions") === "1") {
      setInstructionsAccepted(true);
    }

    const pageParam = searchParams.get("page");
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      const maxPage = startOnly ? 2 : TOTAL_PAGES;
      if (pageNum >= 1 && pageNum <= maxPage) {
        setCurrentPage(pageNum);
      }
    } else if (!portalMode) {
      const storedPage = localStorage.getItem(APPLICATION_PAGE_KEY);
      if (storedPage) {
        const pageNum = parseInt(storedPage, 10);
        const maxPage = startOnly ? 2 : TOTAL_PAGES;
        if (pageNum >= 1 && pageNum <= maxPage) {
          setCurrentPage(pageNum);
        } else if (startOnly) {
          localStorage.setItem(APPLICATION_PAGE_KEY, "2");
        }
      }
    }

    setIsHydrated(true);
  }, [searchParams, startOnly, router]);

  useEffect(() => {
    if (!portalMode || !isHydrated || portalDraftLoadStartedRef.current) return;
    portalDraftLoadStartedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const meRes = await fetch("/api/auth/applicant/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!meRes.ok || cancelled) return;

        const meData = (await meRes.json()) as {
          user?: { email: string };
        };
        const email = meData.user?.email?.trim();
        if (!email || cancelled) return;

        const draftRes = await fetch(
          `/api/applications/draft?email=${encodeURIComponent(email)}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        if (cancelled) return;

        if (draftRes.ok) {
          const draftData = (await draftRes.json()) as {
            application?: ApplicationRecord | null;
          };
          if (draftData.application?.status === "draft") {
            applyDraftToForm(draftData.application);
          } else {
            setForm((prev) => ({
              ...prev,
              email,
              personalEmail: prev.personalEmail.trim() ? prev.personalEmail : email,
            }));
          }
        } else {
          setForm((prev) => ({
            ...prev,
            email,
            personalEmail: prev.personalEmail.trim() ? prev.personalEmail : email,
          }));
        }

        if (!cancelled) {
          setEmailVerified(true);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setDraftHydrationDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [portalMode, isHydrated, applyDraftToForm]);

  useEffect(() => {
    if (!isHydrated || !form.email.trim() || portalMode) return;
    checkEmailVerified(form.email);
  }, [form.email, checkEmailVerified, isHydrated, portalMode]);

  useEffect(() => {
    if (!emailVerified || !form.email.trim()) return;
    const verified = form.email.trim();
    setForm((prev) => {
      if (prev.personalEmail === verified) return prev;
      return { ...prev, personalEmail: verified };
    });
  }, [emailVerified, form.email]);

  useEffect(() => {
    if (
      !portalMode ||
      !isHydrated ||
      !draftHydrationDone ||
      !emailVerified ||
      !form.email.trim() ||
      draftId
    ) {
      return;
    }
    void ensureApplicationId();
  }, [
    portalMode,
    isHydrated,
    draftHydrationDone,
    emailVerified,
    form.email,
    draftId,
    ensureApplicationId,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    setRegionsLoading(true);
    fetch("/api/regions")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            regions?: RegionRecord[];
          } | null
        ) => {
          if (data?.regions?.length) {
            setRegionsList(data.regions);
          }
        }
      )
      .catch(() => {})
      .finally(() => setRegionsLoading(false));
  }, [isHydrated]);

  useEffect(() => {
    if (!regionsList.length) return;
    setForm((prev) => {
      if (!prev.nationality.trim()) return prev;
      const region = regionNameForCountry(regionsList, prev.nationality);
      if (region === prev.region) return prev;
      return { ...prev, region };
    });
  }, [regionsList]);

  const loadHostInstitutions = useCallback(async () => {
    setHostInstitutionsLoading(true);
    setHostInstitutionsError(null);
    try {
      const res = await fetch("/api/universities", { cache: "no-store" });
      const data = (await res.json()) as {
        universityNames?: string[];
        universities?: {
          name: string;
          thematicAreas?: string[];
          programs?: ProgramRecord[];
        }[];
        error?: string;
      };
      if (!res.ok) {
        setHostInstitutionsError(
          data.error ?? "Could not load host institutions."
        );
        return;
      }
      if (!data.universities?.length) {
        setHostInstitutionOptionsList([]);
        setProgramsByHost({});
        setThematicAreasByHost({});
        setHostInstitutionsError(
          "No host institutions are configured yet. Please try again later."
        );
        return;
      }
      setHostInstitutionOptionsList(
        data.universityNames ?? data.universities.map((u) => u.name)
      );
      const programMap: Record<string, ProgramRecord[]> = {};
      const thematicMap: Record<string, string[]> = {};
      for (const u of data.universities) {
        programMap[u.name] = u.programs ?? [];
        thematicMap[u.name] = u.thematicAreas ?? [];
      }
      setProgramsByHost(programMap);
      setThematicAreasByHost(thematicMap);
    } catch {
      setHostInstitutionsError("Could not load host institutions.");
    } finally {
      setHostInstitutionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void loadHostInstitutions();
  }, [isHydrated, loadHostInstitutions]);

  useEffect(() => {
    if (currentPage === 3 && hostInstitutionOptionsList.length === 0) {
      void loadHostInstitutions();
    }
  }, [currentPage, hostInstitutionOptionsList.length, loadHostInstitutions]);

  const canAccessPage = (page: number) => {
    if (page === 1) return true;
    if (!isHydrated) return false;
    if (!instructionsAccepted) return false;
    if (page === 2) return true;
    if (startOnly) return false;
    return emailVerified;
  };

  const getPageDisabledTitle = (page: number) => {
    if (!isHydrated) {
      return "Loading your application progress…";
    }
    if (!instructionsAccepted) {
      return "Accept instructions on page 1 first";
    }
    if (startOnly && page > 2) {
      return "Sign in to the applicant dashboard to continue your application";
    }
    if (page > 2 && !emailVerified) {
      return "Sign in to the applicant dashboard to continue your application";
    }
    return "Complete previous steps first";
  };

  const goToPage = (page: number) => {
    if (canAccessPage(page)) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSendVerification = async () => {
    setVerifyError(null);
    setVerifyMessage(null);
    setVerifyDevLink(null);
    const email = form.email.trim();
    if (!email) {
      setVerifyError("Please enter your email address first.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setVerifyError("Please enter a valid email address.");
      return;
    }
    setVerifySending(true);
    try {
      if (startOnly && emailVerified) {
        setVerifyMessage(ALREADY_VERIFIED_MESSAGE);
        return;
      }

      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        devLink?: string;
        devTempPassword?: string;
        sent?: boolean;
      };
      if (!res.ok) {
        setVerifyError(data.error ?? "Could not send verification email.");
        return;
      }
      setVerifyMessage(
        data.devTempPassword
          ? `${data.message ?? "Verification email sent."} Temporary password (dev): ${data.devTempPassword}`
          : data.message ?? "Verification email sent."
      );
      if (data.devLink) setVerifyDevLink(data.devLink);
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifySending(false);
    }
  };

  const saveProgress = async (nextPage: number): Promise<boolean> => {
    setSaveError(null);
    setSaveMessage(null);

    if (startOnly) {
      if (currentPage === 1) {
        localStorage.setItem(APPLICATION_PAGE_KEY, String(Math.min(nextPage, 2)));
        setSaveMessage("Progress saved.");
        return true;
      }
      setSaveError("Sign in to the applicant dashboard to continue your application.");
      return false;
    }

    if (currentPage === 1) {
      localStorage.setItem(APPLICATION_PAGE_KEY, String(nextPage));
      if (portalMode && form.email.trim()) {
        setSavingDraft(true);
        try {
          const result = await persistDraftToServer(nextPage);
          if (result.error) {
            setSaveError(
              result.status === 401
                ? "Your session has expired. Please sign in again at the applicant login page, then return here to continue."
                : result.error
            );
            return false;
          }
        } finally {
          setSavingDraft(false);
        }
      }
      setSaveMessage("Progress saved.");
      return true;
    }

    const email = form.email.trim();
    if (!email) {
      setSaveError("Enter your email on page 2 to save your progress.");
      return false;
    }

    setSavingDraft(true);
    try {
      const result = await persistDraftToServer(nextPage);
      if (result.error) {
        if (result.status === 401) {
          setSaveError(
            "Your session has expired. Please sign in again at the applicant login page, then return here to continue."
          );
        } else if (result.status === 403) {
          setSaveError(
            result.error === "Password change required"
              ? "Please change your temporary password before continuing your application."
              : "You can only save an application for the email address you signed in with."
          );
        } else {
          setSaveError(result.error ?? "Could not save your progress. Please try again.");
        }
        return false;
      }
      if (result.application) {
        const documentOverrides = await flushPendingDocumentUploads(
          result.application.id
        );
        if (Object.keys(documentOverrides).length > 0) {
          await persistDraftToServer(nextPage, documentOverrides);
        }
      }
      localStorage.setItem(APPLICATION_PAGE_KEY, String(nextPage));
      setSaveMessage("Progress saved.");
      return true;
    } catch {
      setSaveError("Could not save your progress. Check your connection and try again.");
      return false;
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!submitValidation.valid) {
      setSubmitError(
        `Please complete all required fields before submitting. Missing: ${submitValidation.errors.slice(0, 6).join("; ")}${
          submitValidation.errors.length > 6
            ? ` (+${submitValidation.errors.length - 6} more)`
            : ""
        }`
      );
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const registrationEmail = form.email.trim();
      if (registrationEmail) {
        const verifyRes = await fetch(
          `/api/verify-email/status?email=${encodeURIComponent(registrationEmail)}`,
          { cache: "no-store" }
        );
        const verifyData = (await verifyRes.json()) as { verified?: boolean };
        if (!verifyData.verified) {
          setSubmitError(
            "Please verify your email before submitting. Return to page 2, click “Verify email”, and open the link sent to your inbox."
          );
          return;
        }
      }

      const appId = (await ensureApplicationId()) ?? draftId;
      let payload = buildApplicationPayload();
      if (appId) {
        const documentOverrides = await flushPendingDocumentUploads(appId);
        payload = { ...payload, ...documentOverrides };
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          applicationId: appId ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        application?: { id: string };
        confirmationEmailSent?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setSubmitError(
          data.error ??
            "Your application could not be saved. Please try again or contact the coordination office."
        );
        return;
      }
      localStorage.removeItem(APPLICATION_ID_KEY);
      localStorage.removeItem(APPLICATION_PAGE_KEY);
      setDraftId(null);
      setSubmittedApplicationId(data.application?.id ?? null);
      setConfirmationEmailSent(data.confirmationEmailSent ?? null);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(
        "A network error occurred. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentPage === 1 && !instructionsAccepted) return;
    if (startOnly && currentPage >= 2) return;
    if (currentPage === 2 && !emailVerified) {
      setVerifyError(
        "Please verify your email before continuing. Click “Verify email”, then sign in to the applicant dashboard."
      );
      return;
    }
    if (currentPage >= visiblePageCount) return;

    const nextPage = currentPage + 1;
    const saved = await saveProgress(nextPage);
    if (saved) goToPage(nextPage);
  };

  const handlePrevious = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const draftSaveErrorMessage = (result: {
    error?: string;
    status?: number;
  }): string => {
    if (result.status === 401) {
      return "Your session has expired. Please sign in again at the applicant login page, then return here to continue.";
    }
    if (result.status === 403) {
      return result.error === "Password change required"
        ? "Please change your temporary password before continuing your application."
        : "You can only save an application for the email address you signed in with.";
    }
    return result.error ?? "Could not save your progress. Please try again.";
  };

  const handleSignOutToContinueLater = async () => {
    setSaveError(null);
    setSaveMessage(null);
    setSigningOut(true);
    try {
      if (currentPage === 1) {
        localStorage.setItem(APPLICATION_PAGE_KEY, "1");
        if (form.email.trim()) {
          const result = await persistDraftToServer(1);
          if (result.error) {
            setSaveError(draftSaveErrorMessage(result));
            return;
          }
        }
      } else {
        const result = await persistDraftToServer(currentPage);
        if (result.error) {
          setSaveError(draftSaveErrorMessage(result));
          return;
        }
        if (result.application) {
          const documentOverrides = await flushPendingDocumentUploads(
            result.application.id
          );
          if (Object.keys(documentOverrides).length > 0) {
            await persistDraftToServer(currentPage, documentOverrides);
          }
        }
        localStorage.setItem(APPLICATION_PAGE_KEY, String(currentPage));
      }

      await fetch("/api/auth/applicant/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      window.location.href = APPLICANT_LOGIN_PATH;
    } catch {
      setSaveError("Could not sign out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const showSignOutToContinueLater =
    portalMode &&
    currentPage < visiblePageCount &&
    !(startOnly && currentPage === 2 && emailVerified);

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <FormHeader />
        <div className="px-6 py-8 text-center sm:px-8">
          <h2 className="text-2xl font-bold text-[#062763]">
            Application submitted
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Thank you. Your application has been received.
            {submittedApplicationId && (
              <>
                {" "}
                Your reference is{" "}
                <span className="font-semibold text-[#062763]">
                  {submittedApplicationId}
                </span>
                .
              </>
            )}{" "}
            The coordination office will contact you regarding the next steps.
          </p>
          {confirmationEmailSent === true && (
            <p className="mt-2 text-sm text-emerald-700">
              A confirmation email with your full application review (stage 18
              summary) has been sent to your inbox.
            </p>
          )}
          {confirmationEmailSent === false && (
            <p className="mt-2 text-sm text-amber-800">
              We could not send a confirmation email. Please save your reference
              number above.
            </p>
          )}
          {portalMode && (
            <a
              href="/applicant"
              className="mt-6 inline-flex rounded-lg bg-[#062763] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a3580]"
            >
              Return to applicant dashboard
            </a>
          )}
        </div>
        <div className="px-6 py-8 text-center sm:px-8">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setSubmittedApplicationId(null);
              setConfirmationEmailSent(null);
              setSubmitError(null);
              setSaveError(null);
              setSaveMessage(null);
              setDraftId(null);
              setProfileMarkedUploaded(false);
              localStorage.removeItem(APPLICATION_ID_KEY);
              localStorage.removeItem(APPLICATION_PAGE_KEY);
              setForm(initialForm);
              setProfilePreview(null);
              setPassportPreview(null);
              setPassportFileName(null);
              setDisadvantagedDocPreview(null);
              setDisadvantagedDocFileName(null);
              setAcademicCertificatesPreview(null);
              setAcademicCertificatesFileName(null);
              setAcademicTranscriptsPreview(null);
              setAcademicTranscriptsFileName(null);
              setInstructionsAccepted(false);
              if (typeof window !== "undefined") {
                localStorage.removeItem("smecc2e_instructions");
              }
              setEmailVerified(false);
              setVerifyMessage(null);
              setVerifyDevLink(null);
              setVerifyError(null);
              setCurrentPage(1);
            }}
            className="text-sm font-semibold text-[#062763] hover:underline"
          >
            Start a new application
          </button>
        </div>
      </div>
    );
  }

  return (
    <ApplicationUploadContext.Provider value={uploadContextValue}>
    {portalMode ? <ApplicantIdleSessionGuard email={form.email.trim()} /> : null}
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <FormHeader />

      <PageStepper
        currentPage={currentPage}
        totalPages={visiblePageCount}
        canAccessPage={canAccessPage}
        getPageDisabledTitle={getPageDisabledTitle}
        onPageChange={goToPage}
      />

      <form onSubmit={handleSubmit}>
        <div className="border-b border-slate-100 bg-[#062763]/5 px-6 py-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#062763]/60">
            Page {currentPage} of {visiblePageCount}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#062763] sm:text-xl">
            {pageTitles[currentPage]}
          </h2>
        </div>

        <div className="min-h-[280px] px-6 py-6 sm:px-8 sm:py-8">
          {renderPageContent({
            currentPage,
            form,
            update,
            profilePreview,
            setProfilePreview,
            passportPreview,
            setPassportPreview,
            passportFileName,
            setPassportFileName,
            disadvantagedDocPreview,
            setDisadvantagedDocPreview,
            disadvantagedDocFileName,
            setDisadvantagedDocFileName,
            instructionsAccepted,
            setInstructionsAccepted,
            setCurrentPage: goToPage,
            emailVerified,
            verifySending,
            verifyMessage,
            verifyDevLink,
            verifyError,
            onSendVerification: handleSendVerification,
            countryOptions: nationalityCountryOptions,
            residenceCountryOptions,
            regionsLoading,
            onNationalityChange: handleNationalityChange,
            onCountryOfResidenceChange: handleCountryOfResidenceChange,
            startOnly,
            hostInstitutionOptions: hostInstitutionOptionsList,
            hostInstitutionsLoading,
            hostInstitutionsError,
            programsByHost,
            thematicAreasByHost,
            setProfileMarkedUploaded,
            academicCertificatesPreview,
            academicCertificatesFileName,
            setAcademicCertificatesPreview,
            setAcademicCertificatesFileName,
            academicTranscriptsPreview,
            academicTranscriptsFileName,
            setAcademicTranscriptsPreview,
            setAcademicTranscriptsFileName,
            proofOfRegistrationPreview,
            proofOfRegistrationFileName,
            setProofOfRegistrationPreview,
            setProofOfRegistrationFileName,
            proofOfCourseworkPreview,
            proofOfCourseworkFileName,
            setProofOfCourseworkPreview,
            setProofOfCourseworkFileName,
            cvPreview,
            cvFileName,
            setCvPreview,
            setCvFileName,
            publicationsPreview,
            publicationsFileName,
            setPublicationsPreview,
            setPublicationsFileName,
            studyResearchPlanPreview,
            studyResearchPlanFileName,
            setStudyResearchPlanPreview,
            setStudyResearchPlanFileName,
            researchProposalPreview,
            researchProposalFileName,
            setResearchProposalPreview,
            setResearchProposalFileName,
            languageCertificatePreview,
            languageCertificateFileName,
            setLanguageCertificatePreview,
            setLanguageCertificateFileName,
            referenceLettersPreview,
            referenceLettersFileName,
            setReferenceLettersPreview,
            setReferenceLettersFileName,
            graduateAdmissionProofPreview,
            graduateAdmissionProofFileName,
            setGraduateAdmissionProofPreview,
            setGraduateAdmissionProofFileName,
            staffEmploymentProofPreview,
            staffEmploymentProofFileName,
            setStaffEmploymentProofPreview,
            setStaffEmploymentProofFileName,
            staffHostCommitmentPreview,
            staffHostCommitmentLetterFileName,
            setStaffHostCommitmentPreview,
            setStaffHostCommitmentLetterFileName,
            medicalFitnessPreview,
            medicalFitnessDeclarationFileName,
            setMedicalFitnessPreview,
            setMedicalFitnessDeclarationFileName,
            previousScholarshipDeclarationPreview,
            previousScholarshipDeclarationFileName,
            setPreviousScholarshipDeclarationPreview,
            setPreviousScholarshipDeclarationFileName,
          })}
        </div>

        <div className="flex flex-col items-stretch gap-4 border-t border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {currentPage < visiblePageCount ? (
              startOnly && currentPage === 2 && emailVerified ? (
                <Link
                  href={applicantVerifiedLoginPath(form.email.trim())}
                  className="rounded-md bg-[#062763] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3a8a]"
                >
                  Sign in to continue
                </Link>
              ) : (
              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={
                  savingDraft ||
                  signingOut ||
                  (currentPage === 1 && !instructionsAccepted) ||
                  (currentPage === 2 && !emailVerified)
                }
                className="rounded-md bg-[#062763] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3a8a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {savingDraft ? "Saving…" : "Next"}
              </button>
              )
            ) : (
              <button
                type="submit"
                disabled={submitting || !submitValidation.valid}
                title={
                  !submitValidation.valid
                    ? "Complete all required fields before submitting"
                    : undefined
                }
                className="rounded-md bg-[#f7be2a] px-8 py-2.5 text-sm font-extrabold text-[#062763] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            )}
            {showSignOutToContinueLater && (
              <button
                type="button"
                onClick={() => void handleSignOutToContinueLater()}
                disabled={savingDraft || signingOut || submitting}
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? "Saving & signing out…" : "Sign Out to Continue Later"}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {saveMessage && (
              <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                {saveMessage}
              </p>
            )}
            {saveError && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </p>
            )}
            {submitError && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </p>
            )}
            {currentPage === TOTAL_PAGES && !submitValidation.valid && (
              <div
                className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950"
                role="alert"
              >
                <p className="font-semibold">
                  Complete all required fields before you can submit:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {submitValidation.errors.slice(0, 12).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {submitValidation.errors.length > 12 && (
                    <li>…and {submitValidation.errors.length - 12} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Required fields marked with <span className="text-red-600">*</span>
          </p>
        </div>
      </form>
    </div>
    </ApplicationUploadContext.Provider>
  );
}

function PageStepper({
  currentPage,
  totalPages,
  canAccessPage,
  getPageDisabledTitle,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  canAccessPage: (page: number) => boolean;
  getPageDisabledTitle: (page: number) => string;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Application progress"
      className="overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-5 sm:px-6"
    >
      <ol className="mx-auto flex w-max items-center justify-center gap-0">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page, index) => {
          const isActive = currentPage === page;
          const isAccessible = canAccessPage(page);
          const isPast = page < currentPage;

          return (
            <li key={page} className="flex items-center">
              <button
                type="button"
                aria-label={`Go to page ${page}`}
                aria-current={isActive ? "step" : undefined}
                disabled={!isAccessible}
                onClick={() => onPageChange(page)}
                title={
                  !isAccessible
                    ? getPageDisabledTitle(page)
                    : `Page ${page}: ${pageTitles[page]}`
                }
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 sm:text-sm ${
                  isActive
                    ? "bg-[#062763] text-white ring-2 ring-[#f7be2a] ring-offset-2"
                    : isPast && isAccessible
                      ? "bg-[#062763]/80 text-white hover:bg-[#062763]"
                      : isAccessible
                        ? "border-2 border-[#062763] bg-white text-[#062763] hover:bg-[#062763]/10"
                        : "cursor-not-allowed border-2 border-slate-200 bg-slate-100 text-slate-300"
                }`}
              >
                {page}
              </button>
              {index < totalPages - 1 && (
                <span
                  aria-hidden
                  className={`mx-0.5 h-0.5 w-3 shrink-0 sm:w-5 ${
                    page < currentPage ? "bg-[#062763]" : "bg-slate-300"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function renderPageContent({
  currentPage,
  form,
  update,
  profilePreview,
  setProfilePreview,
  passportPreview,
  setPassportPreview,
  passportFileName,
  setPassportFileName,
  disadvantagedDocPreview,
  setDisadvantagedDocPreview,
  disadvantagedDocFileName,
  setDisadvantagedDocFileName,
  instructionsAccepted,
  setInstructionsAccepted,
  emailVerified,
  verifySending,
  verifyMessage,
  verifyDevLink,
  verifyError,
  onSendVerification,
  countryOptions,
  residenceCountryOptions,
  regionsLoading,
  onNationalityChange,
  onCountryOfResidenceChange,
  startOnly,
  hostInstitutionOptions,
  hostInstitutionsLoading,
  hostInstitutionsError,
  programsByHost,
  thematicAreasByHost,
  setProfileMarkedUploaded,
  academicCertificatesPreview,
  academicCertificatesFileName,
  setAcademicCertificatesPreview,
  setAcademicCertificatesFileName,
  academicTranscriptsPreview,
  academicTranscriptsFileName,
  setAcademicTranscriptsPreview,
  setAcademicTranscriptsFileName,
  proofOfRegistrationPreview,
  proofOfRegistrationFileName,
  setProofOfRegistrationPreview,
  setProofOfRegistrationFileName,
  proofOfCourseworkPreview,
  proofOfCourseworkFileName,
  setProofOfCourseworkPreview,
  setProofOfCourseworkFileName,
  cvPreview,
  cvFileName,
  setCvPreview,
  setCvFileName,
  publicationsPreview,
  publicationsFileName,
  setPublicationsPreview,
  setPublicationsFileName,
  studyResearchPlanPreview,
  studyResearchPlanFileName,
  setStudyResearchPlanPreview,
  setStudyResearchPlanFileName,
  researchProposalPreview,
  researchProposalFileName,
  setResearchProposalPreview,
  setResearchProposalFileName,
  languageCertificatePreview,
  languageCertificateFileName,
  setLanguageCertificatePreview,
  setLanguageCertificateFileName,
  referenceLettersPreview,
  referenceLettersFileName,
  setReferenceLettersPreview,
  setReferenceLettersFileName,
  graduateAdmissionProofPreview,
  graduateAdmissionProofFileName,
  setGraduateAdmissionProofPreview,
  setGraduateAdmissionProofFileName,
  staffEmploymentProofPreview,
  staffEmploymentProofFileName,
  setStaffEmploymentProofPreview,
  setStaffEmploymentProofFileName,
  staffHostCommitmentPreview,
  staffHostCommitmentLetterFileName,
  setStaffHostCommitmentPreview,
  setStaffHostCommitmentLetterFileName,
  medicalFitnessPreview,
  medicalFitnessDeclarationFileName,
  setMedicalFitnessPreview,
  setMedicalFitnessDeclarationFileName,
  previousScholarshipDeclarationPreview,
  previousScholarshipDeclarationFileName,
  setPreviousScholarshipDeclarationPreview,
  setPreviousScholarshipDeclarationFileName,
}: {
  currentPage: number;
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  profilePreview: string | null;
  setProfilePreview: (url: string | null) => void;
  setProfileMarkedUploaded: (value: boolean) => void;
  passportPreview: string | null;
  setPassportPreview: (url: string | null) => void;
  passportFileName: string | null;
  setPassportFileName: (name: string | null) => void;
  disadvantagedDocPreview: string | null;
  setDisadvantagedDocPreview: (url: string | null) => void;
  disadvantagedDocFileName: string | null;
  setDisadvantagedDocFileName: (name: string | null) => void;
  instructionsAccepted: boolean;
  setInstructionsAccepted: (value: boolean) => void;
  setCurrentPage: (page: number) => void;
  emailVerified: boolean;
  verifySending: boolean;
  verifyMessage: string | null;
  verifyDevLink: string | null;
  verifyError: string | null;
  onSendVerification: () => void;
  countryOptions: string[];
  residenceCountryOptions: string[];
  regionsLoading: boolean;
  onNationalityChange: (country: string) => void;
  onCountryOfResidenceChange: (country: string) => void;
  startOnly: boolean;
  hostInstitutionOptions: string[];
  hostInstitutionsLoading: boolean;
  hostInstitutionsError: string | null;
  programsByHost: Record<string, ProgramRecord[]>;
  thematicAreasByHost: Record<string, string[]>;
  academicCertificatesPreview: string | null;
  academicCertificatesFileName: string | null;
  setAcademicCertificatesPreview: (url: string | null) => void;
  setAcademicCertificatesFileName: (name: string | null) => void;
  academicTranscriptsPreview: string | null;
  academicTranscriptsFileName: string | null;
  setAcademicTranscriptsPreview: (url: string | null) => void;
  setAcademicTranscriptsFileName: (name: string | null) => void;
  proofOfRegistrationPreview: string | null;
  proofOfRegistrationFileName: string | null;
  setProofOfRegistrationPreview: (url: string | null) => void;
  setProofOfRegistrationFileName: (name: string | null) => void;
  proofOfCourseworkPreview: string | null;
  proofOfCourseworkFileName: string | null;
  setProofOfCourseworkPreview: (url: string | null) => void;
  setProofOfCourseworkFileName: (name: string | null) => void;
  cvPreview: string | null;
  cvFileName: string | null;
  setCvPreview: (url: string | null) => void;
  setCvFileName: (name: string | null) => void;
  publicationsPreview: string | null;
  publicationsFileName: string | null;
  setPublicationsPreview: (url: string | null) => void;
  setPublicationsFileName: (name: string | null) => void;
  studyResearchPlanPreview: string | null;
  studyResearchPlanFileName: string | null;
  setStudyResearchPlanPreview: (url: string | null) => void;
  setStudyResearchPlanFileName: (name: string | null) => void;
  researchProposalPreview: string | null;
  researchProposalFileName: string | null;
  setResearchProposalPreview: (url: string | null) => void;
  setResearchProposalFileName: (name: string | null) => void;
  languageCertificatePreview: string | null;
  languageCertificateFileName: string | null;
  setLanguageCertificatePreview: (url: string | null) => void;
  setLanguageCertificateFileName: (name: string | null) => void;
  referenceLettersPreview: string | null;
  referenceLettersFileName: string | null;
  setReferenceLettersPreview: (url: string | null) => void;
  setReferenceLettersFileName: (name: string | null) => void;
  graduateAdmissionProofPreview: string | null;
  graduateAdmissionProofFileName: string | null;
  setGraduateAdmissionProofPreview: (url: string | null) => void;
  setGraduateAdmissionProofFileName: (name: string | null) => void;
  staffEmploymentProofPreview: string | null;
  staffEmploymentProofFileName: string | null;
  setStaffEmploymentProofPreview: (url: string | null) => void;
  setStaffEmploymentProofFileName: (name: string | null) => void;
  staffHostCommitmentPreview: string | null;
  staffHostCommitmentLetterFileName: string | null;
  setStaffHostCommitmentPreview: (url: string | null) => void;
  setStaffHostCommitmentLetterFileName: (name: string | null) => void;
  medicalFitnessPreview: string | null;
  medicalFitnessDeclarationFileName: string | null;
  setMedicalFitnessPreview: (url: string | null) => void;
  setMedicalFitnessDeclarationFileName: (name: string | null) => void;
  previousScholarshipDeclarationPreview: string | null;
  previousScholarshipDeclarationFileName: string | null;
  setPreviousScholarshipDeclarationPreview: (url: string | null) => void;
  setPreviousScholarshipDeclarationFileName: (name: string | null) => void;
}) {
  switch (currentPage) {
    case 1:
      return (
        <InstructionsPanel
          accepted={instructionsAccepted}
          onAcceptedChange={(value) => {
            setInstructionsAccepted(value);
            if (typeof window !== "undefined") {
              if (value) {
                localStorage.setItem("smecc2e_instructions", "1");
              } else {
                localStorage.removeItem("smecc2e_instructions");
              }
            }
          }}
        />
      );
    case 2:
      return (
        <RegistrationPanel
          form={form}
          update={update}
          profilePreview={profilePreview}
          setProfilePreview={setProfilePreview}
          setProfileMarkedUploaded={setProfileMarkedUploaded}
          emailVerified={emailVerified}
          verifySending={verifySending}
          verifyMessage={verifyMessage}
          verifyDevLink={verifyDevLink}
          verifyError={verifyError}
          onSendVerification={onSendVerification}
          countryOptions={countryOptions}
          residenceCountryOptions={residenceCountryOptions}
          regionsLoading={regionsLoading}
          onNationalityChange={onNationalityChange}
          onCountryOfResidenceChange={onCountryOfResidenceChange}
          startOnly={startOnly}
        />
      );
    case 3:
      return (
        <SectionAMobilityPanel
          form={form}
          update={update}
          hostInstitutionOptions={hostInstitutionOptions}
          hostInstitutionsLoading={hostInstitutionsLoading}
          hostInstitutionsError={hostInstitutionsError}
          programsByHost={programsByHost}
          thematicAreasByHost={thematicAreasByHost}
        />
      );
    case 4:
      return (
        <SectionBPersonalInfoPanel
          form={form}
          update={update}
          verifiedEmail={form.email.trim()}
          passportPreview={passportPreview}
          passportFileName={passportFileName}
          setPassportPreview={setPassportPreview}
          setPassportFileName={setPassportFileName}
        />
      );
    case 5:
      return (
        <SectionCDisabilityPanel
          form={form}
          update={update}
          disadvantagedDocPreview={disadvantagedDocPreview}
          disadvantagedDocFileName={disadvantagedDocFileName}
          setDisadvantagedDocPreview={setDisadvantagedDocPreview}
          setDisadvantagedDocFileName={setDisadvantagedDocFileName}
        />
      );
    case 6:
      return (
        <SectionDEducationPanel
          form={form}
          update={update}
          academicCertificatesPreview={academicCertificatesPreview}
          academicCertificatesFileName={academicCertificatesFileName}
          setAcademicCertificatesPreview={setAcademicCertificatesPreview}
          setAcademicCertificatesFileName={setAcademicCertificatesFileName}
          academicTranscriptsPreview={academicTranscriptsPreview}
          academicTranscriptsFileName={academicTranscriptsFileName}
          setAcademicTranscriptsPreview={setAcademicTranscriptsPreview}
          setAcademicTranscriptsFileName={setAcademicTranscriptsFileName}
        />
      );
    case 7:
      return (
        <SectionERegistrationPanel
          form={form}
          update={update}
          proofOfRegistrationPreview={proofOfRegistrationPreview}
          proofOfRegistrationFileName={proofOfRegistrationFileName}
          setProofOfRegistrationPreview={setProofOfRegistrationPreview}
          setProofOfRegistrationFileName={setProofOfRegistrationFileName}
          proofOfCourseworkPreview={proofOfCourseworkPreview}
          proofOfCourseworkFileName={proofOfCourseworkFileName}
          setProofOfCourseworkPreview={setProofOfCourseworkPreview}
          setProofOfCourseworkFileName={setProofOfCourseworkFileName}
        />
      );
    case 8:
      return (
        <SectionFAcademicProfilePanel
          form={form}
          update={update}
          cvPreview={cvPreview}
          cvFileName={cvFileName}
          setCvPreview={setCvPreview}
          setCvFileName={setCvFileName}
          publicationsPreview={publicationsPreview}
          publicationsFileName={publicationsFileName}
          setPublicationsPreview={setPublicationsPreview}
          setPublicationsFileName={setPublicationsFileName}
        />
      );
    case 9:
      return <SectionGMotivationPanel form={form} update={update} />;
    case 10:
      return (
        <SectionHResearchPanel
          form={form}
          studyResearchPlanPreview={studyResearchPlanPreview}
          studyResearchPlanFileName={studyResearchPlanFileName}
          setStudyResearchPlanPreview={setStudyResearchPlanPreview}
          setStudyResearchPlanFileName={setStudyResearchPlanFileName}
          researchProposalPreview={researchProposalPreview}
          researchProposalFileName={researchProposalFileName}
          setResearchProposalPreview={setResearchProposalPreview}
          setResearchProposalFileName={setResearchProposalFileName}
        />
      );
    case 11:
      return <SectionITraineeshipPanel form={form} update={update} />;
    case 12:
      return <SectionJStaffMobilityPanel form={form} update={update} />;
    case 13:
      return (
        <SectionKLanguagePanel
          form={form}
          update={update}
          languageCertificatePreview={languageCertificatePreview}
          languageCertificateFileName={languageCertificateFileName}
          setLanguageCertificatePreview={setLanguageCertificatePreview}
          setLanguageCertificateFileName={setLanguageCertificateFileName}
        />
      );
    case 14:
      return (
        <SectionLReferencesPanel
          form={form}
          update={update}
          referenceLettersPreview={referenceLettersPreview}
          referenceLettersFileName={referenceLettersFileName}
          setReferenceLettersPreview={setReferenceLettersPreview}
          setReferenceLettersFileName={setReferenceLettersFileName}
        />
      );
    case 15:
      return (
        <SectionMAdditionalDocumentsPanel
          form={form}
          graduateAdmissionProofPreview={graduateAdmissionProofPreview}
          graduateAdmissionProofFileName={graduateAdmissionProofFileName}
          setGraduateAdmissionProofPreview={setGraduateAdmissionProofPreview}
          setGraduateAdmissionProofFileName={setGraduateAdmissionProofFileName}
          staffEmploymentProofPreview={staffEmploymentProofPreview}
          staffEmploymentProofFileName={staffEmploymentProofFileName}
          setStaffEmploymentProofPreview={setStaffEmploymentProofPreview}
          setStaffEmploymentProofFileName={setStaffEmploymentProofFileName}
          staffHostCommitmentPreview={staffHostCommitmentPreview}
          staffHostCommitmentLetterFileName={staffHostCommitmentLetterFileName}
          setStaffHostCommitmentPreview={setStaffHostCommitmentPreview}
          setStaffHostCommitmentLetterFileName={setStaffHostCommitmentLetterFileName}
          medicalFitnessPreview={medicalFitnessPreview}
          medicalFitnessDeclarationFileName={medicalFitnessDeclarationFileName}
          setMedicalFitnessPreview={setMedicalFitnessPreview}
          setMedicalFitnessDeclarationFileName={setMedicalFitnessDeclarationFileName}
        />
      );
    case 16:
      return (
        <SectionNScholarshipPanel
          form={form}
          update={update}
          previousScholarshipDeclarationPreview={previousScholarshipDeclarationPreview}
          previousScholarshipDeclarationFileName={previousScholarshipDeclarationFileName}
          setPreviousScholarshipDeclarationPreview={setPreviousScholarshipDeclarationPreview}
          setPreviousScholarshipDeclarationFileName={setPreviousScholarshipDeclarationFileName}
        />
      );
    case 17:
      return <SectionODeclarationPanel form={form} update={update} />;
    case 18:
      return (
        <ReviewPanel
          form={form}
          profilePreview={profilePreview}
          passportFileName={passportFileName}
          disadvantagedDocFileName={disadvantagedDocFileName}
          academicCertificatesFileName={academicCertificatesFileName}
          academicTranscriptsFileName={academicTranscriptsFileName}
          proofOfRegistrationFileName={proofOfRegistrationFileName}
          proofOfCourseworkFileName={proofOfCourseworkFileName}
          cvFileName={cvFileName}
          publicationsFileName={publicationsFileName}
          studyResearchPlanFileName={studyResearchPlanFileName}
          researchProposalFileName={researchProposalFileName}
          languageCertificateFileName={languageCertificateFileName}
          referenceLettersFileName={referenceLettersFileName}
          graduateAdmissionProofFileName={graduateAdmissionProofFileName}
          staffEmploymentProofFileName={staffEmploymentProofFileName}
          staffHostCommitmentLetterFileName={staffHostCommitmentLetterFileName}
          medicalFitnessDeclarationFileName={medicalFitnessDeclarationFileName}
          previousScholarshipDeclarationFileName={previousScholarshipDeclarationFileName}
        />
      );
    default:
      return <PlaceholderPage page={currentPage} />;
  }
}

function RegistrationPanel({
  form,
  update,
  profilePreview,
  setProfilePreview,
  setProfileMarkedUploaded,
  emailVerified,
  verifySending,
  verifyMessage,
  verifyDevLink,
  verifyError,
  onSendVerification,
  countryOptions,
  residenceCountryOptions,
  regionsLoading,
  onNationalityChange,
  onCountryOfResidenceChange,
  startOnly = false,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  profilePreview: string | null;
  setProfilePreview: (url: string | null) => void;
  setProfileMarkedUploaded: (value: boolean) => void;
  emailVerified: boolean;
  verifySending: boolean;
  verifyMessage: string | null;
  verifyDevLink: string | null;
  verifyError: string | null;
  onSendVerification: () => void;
  countryOptions: string[];
  residenceCountryOptions: string[];
  regionsLoading: boolean;
  onNationalityChange: (country: string) => void;
  onCountryOfResidenceChange: (country: string) => void;
  startOnly?: boolean;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          Email verification
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-700">
          Verify your email to access your applicant dashboard. The email includes
          a verification link and a temporary password to sign in.
        </p>
      </div>

      <div className="rounded-xl border-2 border-[#062763]/35 bg-[#eef2f7] p-4 sm:p-5">
        <ShortAnswer
          required
          label="Email address for verification"
          type="email"
          description={
            emailVerified && !startOnly
              ? "This email is verified and cannot be changed."
              : "This is your primary contact email for the application."
          }
          value={form.email}
          onChange={(v) => update("email", v)}
          disabled={emailVerified && !startOnly}
        />
        {emailVerified && startOnly && form.email.trim() && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
          >
            <p className="font-medium">{ALREADY_VERIFIED_MESSAGE}</p>
            <Link
              href={applicantLoginPath(form.email.trim())}
              className="mt-3 inline-flex rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a3580]"
            >
              Go to application login
            </Link>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSendVerification}
            disabled={
              verifySending ||
              !form.email.trim() ||
              (emailVerified && !startOnly) ||
              (emailVerified && startOnly)
            }
            className="rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3a8a] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {verifySending ? "Sending…" : "Verify email"}
          </button>
        </div>
        {verifyMessage && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {verifyMessage}
          </p>
        )}
        {verifyDevLink && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
            <p className="font-semibold text-amber-950">
              Development mode — open this link to verify:
            </p>
            <a
              href={verifyDevLink}
              className="mt-2 break-all font-medium text-[#062763] underline"
            >
              {verifyDevLink}
            </a>
          </div>
        )}
        {verifyError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {verifyError}
          </p>
        )}
      </div>

      {emailVerified && !startOnly ? (
        <>
          <p className="text-sm font-semibold text-emerald-800">
            Email verified. Complete your registration below, then use Next to
            continue to Section A.
          </p>
          <ProfilePictureUpload
            preview={profilePreview}
            onFileSelect={(_file, previewUrl) => {
              if (profilePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(profilePreview);
              }
              setProfilePreview(previewUrl);
              setProfileMarkedUploaded(true);
            }}
            onClear={() => {
              if (profilePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(profilePreview);
              }
              setProfilePreview(null);
              setProfileMarkedUploaded(false);
            }}
          />
          <SelectField
            required
            label="Nationality (i.e Country of Origin)"
            value={form.nationality}
            onChange={onNationalityChange}
            options={countryOptions}
            placeholder={
              regionsLoading ? "Loading countries…" : "Select country"
            }
            disabled={regionsLoading || countryOptions.length === 0}
            description="Countries are loaded from SMECC2E regional groupings."
          />
          <SelectField
            label="Country of Residence"
            value={form.countryOfResidence}
            onChange={onCountryOfResidenceChange}
            options={residenceCountryOptions}
            placeholder="Select country"
            description="All African countries."
          />
          <SelectField
            label="Region"
            value={form.region}
            onChange={() => {}}
            options={form.region ? [form.region] : []}
            placeholder={
              !form.nationality.trim()
                ? "Select nationality first"
                : "No matching region for this nationality"
            }
            disabled
            description="Set automatically from your nationality (country of origin)."
          />
        </>
      ) : !emailVerified ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
          {startOnly
            ? "After you verify your email, sign in to the applicant dashboard to continue. Verified email alone does not open the application form."
            : "After you verify your email via the link sent to your inbox, you will return here to complete your registration details."}
        </p>
      ) : null}
    </div>
  );
}

function SectionAMobilityPanel({
  form,
  update,
  hostInstitutionOptions,
  hostInstitutionsLoading,
  hostInstitutionsError,
  programsByHost,
  thematicAreasByHost,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  hostInstitutionOptions: string[];
  hostInstitutionsLoading: boolean;
  hostInstitutionsError: string | null;
  programsByHost: Record<string, ProgramRecord[]>;
  thematicAreasByHost: Record<string, string[]>;
}) {
  const { typeOfMobility, preferredHostInstitution, thematicArea } = form;

  const institutionOptions = useMemo(() => {
    if (
      preferredHostInstitution &&
      !hostInstitutionOptions.includes(preferredHostInstitution)
    ) {
      return [...hostInstitutionOptions, preferredHostInstitution].sort((a, b) =>
        a.localeCompare(b)
      );
    }
    return hostInstitutionOptions;
  }, [hostInstitutionOptions, preferredHostInstitution]);

  const hostPrograms = programsForMobilityAtHost(
    programsByHost,
    preferredHostInstitution,
    typeOfMobility
  );
  const thematicAreaOptions = preferredHostInstitution
    ? thematicAreasForHost(
        thematicAreasByHost,
        programsByHost,
        preferredHostInstitution
      )
    : [];
  const programmeOptions = thematicArea
    ? programmeNamesForThematicArea(hostPrograms, thematicArea)
    : [];
  const noProgramsForArea =
    Boolean(thematicArea) && programmeOptions.length === 0;

  const handleMobilityChange = (value: string) => {
    update("typeOfMobility", value);
    update("preferredHostInstitution", "");
    update("proposedAcademicProgramme", "");
    update("thematicArea", "");
  };

  const handleHostChange = (value: string) => {
    update("preferredHostInstitution", value);
    update("proposedAcademicProgramme", "");
    update("thematicArea", "");
  };

  const handleThematicAreaChange = (value: string) => {
    update("thematicArea", value);
    update("proposedAcademicProgramme", "");
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION A: Mobility Category Selection (Applicable to All Applicants)
        </h3>
      </div>

      <SelectField
        required
        label="Type of Mobility"
        value={typeOfMobility}
        onChange={handleMobilityChange}
        options={mobilityTypes}
        placeholder="Select type of mobility"
      />

      {typeOfMobility && (
        <>
          {hostInstitutionsError && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              role="alert"
            >
              {hostInstitutionsError}
            </p>
          )}
          <SelectField
            required
            label="Preferred Host Institution"
            value={preferredHostInstitution}
            onChange={handleHostChange}
            options={institutionOptions}
            placeholder={
              hostInstitutionsLoading
                ? "Loading host institutions…"
                : institutionOptions.length === 0
                  ? "No host institutions available"
                  : "Select host institution"
            }
            disabled={hostInstitutionsLoading || institutionOptions.length === 0}
          />
        </>
      )}

      {isMastersOrPhd(typeOfMobility) && preferredHostInstitution && (
        <SelectField
          required
          label="Thematic Area"
          description={`Thematic areas from programmes at ${preferredHostInstitution}`}
          value={thematicArea}
          onChange={handleThematicAreaChange}
          options={thematicAreaOptions}
          placeholder={
            thematicAreaOptions.length === 0
              ? "No thematic areas configured for this institution"
              : "Select thematic area"
          }
          disabled={thematicAreaOptions.length === 0}
        />
      )}

      {isMastersOrPhd(typeOfMobility) &&
        preferredHostInstitution &&
        thematicArea &&
        noProgramsForArea && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            There is no available program for this area.
          </p>
        )}

      {isMastersOrPhd(typeOfMobility) &&
        preferredHostInstitution &&
        thematicArea &&
        programmeOptions.length > 0 && (
          <SelectField
            required
            label="Proposed Academic Programme"
            description={`Programmes in “${thematicArea}” at ${preferredHostInstitution}`}
            value={form.proposedAcademicProgramme}
            onChange={(v) => update("proposedAcademicProgramme", v)}
            options={programmeOptions}
            placeholder="Select academic programme"
          />
        )}
    </div>
  );
}

function SectionBPersonalInfoPanel({
  form,
  update,
  verifiedEmail,
  passportPreview,
  passportFileName,
  setPassportPreview,
  setPassportFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  verifiedEmail: string;
  passportPreview: string | null;
  passportFileName: string | null;
  setPassportPreview: (url: string | null) => void;
  setPassportFileName: (name: string | null) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION B: Personal Information (All Applicants)
        </h3>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <ShortAnswer
          required
          label="Surname"
          value={form.surname}
          onChange={(v) => update("surname", v)}
        />
        <ShortAnswer
          required
          label="First Name"
          value={form.firstName}
          onChange={(v) => update("firstName", v)}
        />
      </div>

      <ShortAnswer
        label="Middle Name"
        value={form.middleName}
        onChange={(v) => update("middleName", v)}
      />

      <MultipleChoice
        required
        label="Gender"
        name="gender"
        options={genderOptions}
        value={form.gender}
        onChange={(v) => update("gender", v)}
      />

      <ShortAnswer
        required
        label="Date of Birth"
        type="date"
        value={form.dateOfBirth}
        onChange={(v) => update("dateOfBirth", v)}
      />

      <ShortAnswer
        required
        label="State/Province"
        value={form.stateProvince}
        onChange={(v) => update("stateProvince", v)}
      />

      <Paragraph
        required
        label="Home Address"
        value={form.homeAddress}
        onChange={(v) => update("homeAddress", v)}
        rows={3}
      />

      <ShortAnswer
        required
        label="Email Address"
        type="email"
        value={verifiedEmail}
        onChange={() => {}}
        disabled
        description="Your verified email from registration (page 2). This cannot be changed."
      />

      <ShortAnswer
        required
        label="Phone Number (WhatsApp preferred)"
        type="tel"
        value={form.phoneNumber}
        onChange={(v) => update("phoneNumber", v)}
      />

      <ShortAnswer
        label="Social Media Account URL (LinkedIn)"
        type="url"
        value={form.linkedinUrl}
        onChange={(v) => update("linkedinUrl", v)}
      />

      <ShortAnswer
        label="Social Media Account URL (Facebook or X or Instagram)"
        type="url"
        value={form.socialMediaUrl}
        onChange={(v) => update("socialMediaUrl", v)}
      />

      <ShortAnswer
        required
        label="Passport Number / National ID Number"
        value={form.passportOrIdNumber}
        onChange={(v) => update("passportOrIdNumber", v)}
      />

      <DocumentUpload
        label="Upload Passport Bio-data Page or National ID"
        description="Upload 1 supported file: PDF or image. Max 1 MB."
        accept="image/jpeg,image/png,image/webp,application/pdf"
        maxSizeMb={1}
        preview={passportPreview}
        fileName={passportFileName}
        documentField="passport"
        onFileSelect={(file, previewUrl, storedName) => {
          if (passportPreview) URL.revokeObjectURL(passportPreview);
          setPassportPreview(previewUrl);
          setPassportFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (passportPreview) URL.revokeObjectURL(passportPreview);
          setPassportPreview(null);
          setPassportFileName(null);
        }}
      />

      <div className="border-t border-slate-100 pt-6">
        <h4 className="mb-6 text-sm font-semibold text-[#062763] sm:text-base">
          Next of Kin
        </h4>
        <div className="space-y-8">
          <ShortAnswer
            label="Names of Next of Kin"
            value={form.nextOfKinName}
            onChange={(v) => update("nextOfKinName", v)}
          />
          <ShortAnswer
            label="Whatsapp Phone number of Next of Kin"
            type="tel"
            value={form.nextOfKinWhatsapp}
            onChange={(v) => update("nextOfKinWhatsapp", v)}
          />
          <ShortAnswer
            label="Email address of Next of Kin"
            type="email"
            value={form.nextOfKinEmail}
            onChange={(v) => update("nextOfKinEmail", v)}
          />
          <ShortAnswer
            label="Relationship with next of kin"
            value={form.nextOfKinRelationship}
            onChange={(v) => update("nextOfKinRelationship", v)}
          />
        </div>
      </div>
    </div>
  );
}

function formatEducationalQualifications(form: typeof initialForm): string {
  return educationalQualificationFields
    .filter(({ key }) => form[key])
    .map(({ label }) => label)
    .join("; ");
}

function formatRefereeSummary(
  name: string,
  relationship: string,
  institution: string,
  email: string
): string {
  const parts = [
    name.trim() && `Name: ${name.trim()}`,
    relationship.trim() && `Relationship: ${relationship.trim()}`,
    institution.trim() && `Institution: ${institution.trim()}`,
    email.trim() && `Email: ${email.trim()}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatDisadvantagedCategories(form: typeof initialForm): string {
  const selected = disadvantagedCategoryFields
    .filter(({ key }) => form[key])
    .map(({ label }) => label);
  if (form.disadvantagedOther && form.disadvantagedOtherSpecify.trim()) {
    const idx = selected.indexOf("Other (specify)");
    if (idx !== -1) {
      selected[idx] = `Other: ${form.disadvantagedOtherSpecify.trim()}`;
    }
  }
  return selected.join("; ");
}

function SectionCDisabilityPanel({
  form,
  update,
  disadvantagedDocPreview,
  disadvantagedDocFileName,
  setDisadvantagedDocPreview,
  setDisadvantagedDocFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  disadvantagedDocPreview: string | null;
  disadvantagedDocFileName: string | null;
  setDisadvantagedDocPreview: (url: string | null) => void;
  setDisadvantagedDocFileName: (name: string | null) => void;
}) {
  const isYes = form.belongsToDisadvantagedGroup === "Yes";

  const clearDisadvantagedDetails = () => {
    for (const { key } of disadvantagedCategoryFields) {
      update(key, false);
    }
    update("disadvantagedOtherSpecify", "");
    if (disadvantagedDocPreview) URL.revokeObjectURL(disadvantagedDocPreview);
    setDisadvantagedDocPreview(null);
    setDisadvantagedDocFileName(null);
  };

  const handleDisadvantagedGroupChange = (value: string) => {
    update("belongsToDisadvantagedGroup", value);
    if (value === "No") clearDisadvantagedDetails();
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION C: Disability and Inclusion Information (All applicants)
        </h3>
      </div>

      <MultipleChoice
        required
        label="Do you belong to a disadvantaged group?"
        name="belongsToDisadvantagedGroup"
        options={["Yes", "No"]}
        value={form.belongsToDisadvantagedGroup}
        onChange={handleDisadvantagedGroupChange}
      />

      {isYes && (
        <>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800 sm:text-base">
              If yes, specify:
            </legend>
            <div className={fieldOptionsBoxClass}>
              {disadvantagedCategoryFields.map(({ key, label }) => (
                <label key={key} className={fieldOptionLabelClass}>
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => update(key, e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded accent-[#062763]"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.disadvantagedOther && (
            <ShortAnswer
              label="Other (specify)"
              value={form.disadvantagedOtherSpecify}
              onChange={(v) => update("disadvantagedOtherSpecify", v)}
            />
          )}

          <DocumentUpload
            label="Upload supporting documents"
            description="Please merge all valid documents that identify you as a disadvantaged applicant into one PDF file. Upload 1 supported file: PDF, document, or image. Max 1 MB."
            accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            maxSizeMb={1}
            preview={disadvantagedDocPreview}
            fileName={disadvantagedDocFileName}
            documentField="disadvantagedDoc"
            onFileSelect={(_file, previewUrl, storedName) => {
              if (disadvantagedDocPreview) {
                URL.revokeObjectURL(disadvantagedDocPreview);
              }
              setDisadvantagedDocPreview(previewUrl);
              setDisadvantagedDocFileName(storedName ?? _file.name);
            }}
            onClear={() => {
              if (disadvantagedDocPreview) {
                URL.revokeObjectURL(disadvantagedDocPreview);
              }
              setDisadvantagedDocPreview(null);
              setDisadvantagedDocFileName(null);
            }}
          />
        </>
      )}
    </div>
  );
}

function SectionDEducationPanel({
  form,
  update,
  academicCertificatesPreview,
  academicCertificatesFileName,
  setAcademicCertificatesPreview,
  setAcademicCertificatesFileName,
  academicTranscriptsPreview,
  academicTranscriptsFileName,
  setAcademicTranscriptsPreview,
  setAcademicTranscriptsFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  academicCertificatesPreview: string | null;
  academicCertificatesFileName: string | null;
  setAcademicCertificatesPreview: (url: string | null) => void;
  setAcademicCertificatesFileName: (name: string | null) => void;
  academicTranscriptsPreview: string | null;
  academicTranscriptsFileName: string | null;
  setAcademicTranscriptsPreview: (url: string | null) => void;
  setAcademicTranscriptsFileName: (name: string | null) => void;
}) {
  const handleQualificationChange = (
    key: (typeof educationalQualificationFields)[number]["key"],
    checked: boolean
  ) => {
    update(key, checked);
    if (key === "eduBachelor" && !checked) {
      update("bachelorProgrammeUniversity", "");
      update("bachelorCgpa", "");
    }
    if (key === "eduMaster" && !checked) {
      update("masterProgrammeUniversity", "");
      update("masterCgpa", "");
    }
  };

  const documentAccept =
    "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION D: Educational Background (All applicants)
        </h3>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800 sm:text-base">
          Select Educational Qualifications
          <RequiredMark required />
        </legend>
        <div className={fieldOptionsBoxClass}>
          {educationalQualificationFields.map(({ key, label }) => (
            <label key={key} className={fieldOptionLabelClass}>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => handleQualificationChange(key, e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded accent-[#062763]"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {form.eduBachelor && (
        <>
          <ShortAnswer
            required
            label="Name of Programme and University where the Bachelors degree was obtained"
            description="e.g. Bachelors in Mechanical Engineering, University of Nigeria"
            value={form.bachelorProgrammeUniversity}
            onChange={(v) => update("bachelorProgrammeUniversity", v)}
          />
          <ShortAnswer
            required
            numericOnly
            label="Cumulative Grade Point Average (CGPA) for the Bachelors Degree"
            description="e.g. 4.2"
            value={form.bachelorCgpa}
            onChange={(v) => update("bachelorCgpa", v)}
          />
        </>
      )}

      {form.eduMaster && (
        <>
          <ShortAnswer
            required
            label="Name of Programme and University where the Masters degree was obtained"
            description="e.g. Masters in Mechanical Engineering, Moi University"
            value={form.masterProgrammeUniversity}
            onChange={(v) => update("masterProgrammeUniversity", v)}
          />
          <ShortAnswer
            required
            numericOnly
            label="Cumulative Grade Point Average (CGPA) for Masters Degree"
            description="e.g. 4.2"
            value={form.masterCgpa}
            onChange={(v) => update("masterCgpa", v)}
          />
        </>
      )}

      <DocumentUpload
        label="Upload All Academic Certificates (merged as one PDF file)"
        description="Upload 1 supported file: PDF, document, or image. Max 10 MB."
        accept={documentAccept}
        maxSizeMb={10}
        required
        preview={academicCertificatesPreview}
        fileName={academicCertificatesFileName}
        documentField="academicCertificates"
        onFileSelect={(file, previewUrl, storedName) => {
          if (academicCertificatesPreview) {
            URL.revokeObjectURL(academicCertificatesPreview);
          }
          setAcademicCertificatesPreview(previewUrl);
          setAcademicCertificatesFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (academicCertificatesPreview) {
            URL.revokeObjectURL(academicCertificatesPreview);
          }
          setAcademicCertificatesPreview(null);
          setAcademicCertificatesFileName(null);
        }}
      />

      <DocumentUpload
        label="Upload All Academic Transcripts (merged as one PDF file)"
        description="Upload 1 supported file: PDF, document, or image. Max 10 MB."
        accept={documentAccept}
        maxSizeMb={10}
        required
        preview={academicTranscriptsPreview}
        fileName={academicTranscriptsFileName}
        documentField="academicTranscripts"
        onFileSelect={(file, previewUrl, storedName) => {
          if (academicTranscriptsPreview) {
            URL.revokeObjectURL(academicTranscriptsPreview);
          }
          setAcademicTranscriptsPreview(previewUrl);
          setAcademicTranscriptsFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (academicTranscriptsPreview) {
            URL.revokeObjectURL(academicTranscriptsPreview);
          }
          setAcademicTranscriptsPreview(null);
          setAcademicTranscriptsFileName(null);
        }}
      />
    </div>
  );
}

function SectionERegistrationPanel({
  form,
  update,
  proofOfRegistrationPreview,
  proofOfRegistrationFileName,
  setProofOfRegistrationPreview,
  setProofOfRegistrationFileName,
  proofOfCourseworkPreview,
  proofOfCourseworkFileName,
  setProofOfCourseworkPreview,
  setProofOfCourseworkFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  proofOfRegistrationPreview: string | null;
  proofOfRegistrationFileName: string | null;
  setProofOfRegistrationPreview: (url: string | null) => void;
  setProofOfRegistrationFileName: (name: string | null) => void;
  proofOfCourseworkPreview: string | null;
  proofOfCourseworkFileName: string | null;
  setProofOfCourseworkPreview: (url: string | null) => void;
  setProofOfCourseworkFileName: (name: string | null) => void;
}) {
  if (!isCreditSeeking(form.typeOfMobility)) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6">
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION E: Current Registration Status (only for Research Credit
          Seeking)
        </h3>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          This section applies only to MSc and PhD Credit-Seeking mobility
          applicants. Your selected mobility type does not require these
          details — use Next to continue.
        </p>
      </div>
    );
  }

  const registrationDocAccept =
    "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const courseworkAccept = "application/pdf,.pdf";

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION E: Current Registration Status (only for Research Credit
          Seeking)
        </h3>
      </div>

      <MultipleChoice
        required
        label="Are you currently enrolled in a degree programme?"
        name="currentlyEnrolledInDegree"
        options={["Yes", "No"]}
        value={form.currentlyEnrolledInDegree}
        onChange={(v) => update("currentlyEnrolledInDegree", v)}
      />

      <ShortAnswer
        required
        label="Registration Number"
        value={form.registrationNumber}
        onChange={(v) => update("registrationNumber", v)}
      />

      <DocumentUpload
        required
        label="Upload Proof of Registration"
        description="Upload Admission letter, evidence of fees paid for the session, and Programme registration information as one PDF. Upload 1 supported file: PDF, document, or image. Max 1 MB."
        accept={registrationDocAccept}
        maxSizeMb={1}
        preview={proofOfRegistrationPreview}
        fileName={proofOfRegistrationFileName}
        documentField="proofOfRegistration"
        onFileSelect={(file, previewUrl, storedName) => {
          if (proofOfRegistrationPreview) {
            URL.revokeObjectURL(proofOfRegistrationPreview);
          }
          setProofOfRegistrationPreview(previewUrl);
          setProofOfRegistrationFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (proofOfRegistrationPreview) {
            URL.revokeObjectURL(proofOfRegistrationPreview);
          }
          setProofOfRegistrationPreview(null);
          setProofOfRegistrationFileName(null);
        }}
      />

      <DocumentUpload
        label="Upload Proof of Coursework completion"
        description="Upload 1 supported file: PDF. Max 10 MB."
        accept={courseworkAccept}
        maxSizeMb={10}
        preview={proofOfCourseworkPreview}
        fileName={proofOfCourseworkFileName}
        documentField="proofOfCoursework"
        onFileSelect={(file, previewUrl, storedName) => {
          if (proofOfCourseworkPreview) {
            URL.revokeObjectURL(proofOfCourseworkPreview);
          }
          setProofOfCourseworkPreview(previewUrl);
          setProofOfCourseworkFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (proofOfCourseworkPreview) {
            URL.revokeObjectURL(proofOfCourseworkPreview);
          }
          setProofOfCourseworkPreview(null);
          setProofOfCourseworkFileName(null);
        }}
      />
    </div>
  );
}

function SectionFAcademicProfilePanel({
  form,
  update,
  cvPreview,
  cvFileName,
  setCvPreview,
  setCvFileName,
  publicationsPreview,
  publicationsFileName,
  setPublicationsPreview,
  setPublicationsFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  cvPreview: string | null;
  cvFileName: string | null;
  setCvPreview: (url: string | null) => void;
  setCvFileName: (name: string | null) => void;
  publicationsPreview: string | null;
  publicationsFileName: string | null;
  setPublicationsPreview: (url: string | null) => void;
  setPublicationsFileName: (name: string | null) => void;
}) {
  const documentAccept =
    "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const publicationsAccept = "application/pdf,.pdf";

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION F: Academic &amp; Professional Profile (All Applicants)
        </h3>
      </div>

      <DocumentUpload
        required
        label="Curriculum Vitae Upload (Maximum 2 pages)"
        description="Please include your relevant academic/research experience. Upload 1 supported file: PDF, document, or image. Max 10 MB."
        accept={documentAccept}
        maxSizeMb={10}
        preview={cvPreview}
        fileName={cvFileName}
        documentField="cv"
        onFileSelect={(file, previewUrl, storedName) => {
          if (cvPreview) {
            URL.revokeObjectURL(cvPreview);
          }
          setCvPreview(previewUrl);
          setCvFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (cvPreview) {
            URL.revokeObjectURL(cvPreview);
          }
          setCvPreview(null);
          setCvFileName(null);
        }}
      />

      <DocumentUpload
        label="Publications (if any)"
        description="At most three most recent publications — merged together as one publication. Upload 1 supported file: PDF. Max 10 MB."
        accept={publicationsAccept}
        maxSizeMb={10}
        preview={publicationsPreview}
        fileName={publicationsFileName}
        documentField="publications"
        onFileSelect={(file, previewUrl, storedName) => {
          if (publicationsPreview) {
            URL.revokeObjectURL(publicationsPreview);
          }
          setPublicationsPreview(previewUrl);
          setPublicationsFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (publicationsPreview) {
            URL.revokeObjectURL(publicationsPreview);
          }
          setPublicationsPreview(null);
          setPublicationsFileName(null);
        }}
      />

      <Paragraph
        required
        label="Why are you applying for the SMECC2E Scholarship?"
        description="Maximum 500 words."
        rows={8}
        maxWords={500}
        value={form.whyApplyingScholarship}
        onChange={(v) => update("whyApplyingScholarship", v)}
      />
    </div>
  );
}

function SectionGMotivationPanel({
  form,
  update,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION G: Motivation and Relevance (for all applicants)
        </h3>
      </div>

      <Paragraph
        required
        label="Explain how your background aligns with the selected thematic area."
        description="Maximum 300 words."
        rows={6}
        maxWords={300}
        value={form.backgroundThematicAlignment}
        onChange={(v) => update("backgroundThematicAlignment", v)}
      />

      <Paragraph
        required
        label="Explain how the scholarship will contribute to your academic/career goals."
        description="Maximum 300 words."
        rows={6}
        maxWords={300}
        value={form.scholarshipCareerGoals}
        onChange={(v) => update("scholarshipCareerGoals", v)}
      />

      <Paragraph
        required
        label="How will you contribute to Africa’s clean energy transition and climate resilience after the mobility?"
        description="Maximum 300 words."
        rows={6}
        maxWords={300}
        value={form.africaCleanEnergyContribution}
        onChange={(v) => update("africaCleanEnergyContribution", v)}
      />
    </div>
  );
}

function SectionHResearchPanel({
  form,
  studyResearchPlanPreview,
  studyResearchPlanFileName,
  setStudyResearchPlanPreview,
  setStudyResearchPlanFileName,
  researchProposalPreview,
  researchProposalFileName,
  setResearchProposalPreview,
  setResearchProposalFileName,
}: {
  form: typeof initialForm;
  studyResearchPlanPreview: string | null;
  studyResearchPlanFileName: string | null;
  setStudyResearchPlanPreview: (url: string | null) => void;
  setStudyResearchPlanFileName: (name: string | null) => void;
  researchProposalPreview: string | null;
  researchProposalFileName: string | null;
  setResearchProposalPreview: (url: string | null) => void;
  setResearchProposalFileName: (name: string | null) => void;
}) {
  const creditSeeking = isCreditSeeking(form.typeOfMobility);
  const degreeSeeking = isDegreeSeeking(form.typeOfMobility);

  const studyPlanAccept =
    "application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const researchProposalAccept =
    "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!creditSeeking && !degreeSeeking) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6">
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION H: Research Proposal/Study Plan
        </h3>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          This section applies only to MSc and PhD Degree-Seeking or
          Credit-Seeking applicants. Your selected mobility type does not
          require a study plan or research proposal — use Next to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION H: Research Proposal/Study Plan
        </h3>
      </div>

      {creditSeeking && (
        <DocumentUpload
          required
          label="Upload Study/Research Plan (MSc/PhD Credit Seeking Applicants only)"
          description="Upload 1 supported file: PDF or document. Max 10 MB."
          accept={studyPlanAccept}
          maxSizeMb={10}
          preview={studyResearchPlanPreview}
          fileName={studyResearchPlanFileName}
          documentField="studyResearchPlan"
          onFileSelect={(file, previewUrl, storedName) => {
            if (studyResearchPlanPreview) {
              URL.revokeObjectURL(studyResearchPlanPreview);
            }
            setStudyResearchPlanPreview(previewUrl);
            setStudyResearchPlanFileName(storedName ?? file.name);
          }}
          onClear={() => {
            if (studyResearchPlanPreview) {
              URL.revokeObjectURL(studyResearchPlanPreview);
            }
            setStudyResearchPlanPreview(null);
            setStudyResearchPlanFileName(null);
          }}
        />
      )}

      {degreeSeeking && (
        <DocumentUpload
          required
          label="Upload Research Proposal (MSc/PhD Degree Seeking)"
          description="A 2 paged research proposal (in PDF) that contains title, problem statement, objectives, proposed methodology, and expected impact. Upload 1 supported file: PDF, document, or image. Max 1 MB."
          accept={researchProposalAccept}
          maxSizeMb={1}
          preview={researchProposalPreview}
          fileName={researchProposalFileName}
          documentField="researchProposal"
          onFileSelect={(file, previewUrl, storedName) => {
            if (researchProposalPreview) {
              URL.revokeObjectURL(researchProposalPreview);
            }
            setResearchProposalPreview(previewUrl);
            setResearchProposalFileName(storedName ?? file.name);
          }}
          onClear={() => {
            if (researchProposalPreview) {
              URL.revokeObjectURL(researchProposalPreview);
            }
            setResearchProposalPreview(null);
            setResearchProposalFileName(null);
          }}
        />
      )}
    </div>
  );
}

function SectionITraineeshipPanel({
  form,
  update,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
}) {
  if (!isTraineeshipApplicant(form.typeOfMobility)) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6">
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION I: Traineeship Information (for trainee applicants only)
        </h3>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          This section applies only to Traineeship Mobility applicants. Your
          selected mobility type does not require these details — use Next to
          continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION I: Traineeship Information (for trainee applicants only)
        </h3>
      </div>

      <MultipleChoice
        required
        label="Preferred Industry Sector"
        name="traineePreferredIndustrySector"
        options={[...traineeIndustrySectorOptions]}
        value={form.traineePreferredIndustrySector}
        onChange={(v) => update("traineePreferredIndustrySector", v)}
      />

      <Paragraph
        required
        label="Relevant Skills for Traineeship"
        rows={5}
        value={form.traineeshipRelevantSkills}
        onChange={(v) => update("traineeshipRelevantSkills", v)}
      />

      <Paragraph
        required
        label="Career Interest Area"
        rows={5}
        value={form.traineeshipCareerInterestArea}
        onChange={(v) => update("traineeshipCareerInterestArea", v)}
      />

      <MultipleChoice
        required
        label="Current Programme Type"
        name="traineeshipCurrentProgrammeType"
        options={["PhD", "Masters"]}
        value={form.traineeshipCurrentProgrammeType}
        onChange={(v) => update("traineeshipCurrentProgrammeType", v)}
      />

      <ShortAnswer
        required
        label="Current Position"
        value={form.traineeshipCurrentPosition}
        onChange={(v) => update("traineeshipCurrentPosition", v)}
      />
    </div>
  );
}

function SectionJStaffMobilityPanel({
  form,
  update,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
}) {
  if (!isStaffMobilityApplicant(form.typeOfMobility)) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6">
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION J: Staff Mobility (Only Staff mobility)
        </h3>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          This section applies only to Staff Mobility applicants. Your selected
          mobility type does not require these details — use Next to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION J: Staff Mobility (Only Staff mobility)
        </h3>
      </div>

      <Paragraph
        label="Name of the Organizations you worked with."
        rows={4}
        value={form.staffOrganizationsWorkedWith}
        onChange={(v) => update("staffOrganizationsWorkedWith", v)}
      />

      <ShortAnswer
        required
        label="Current Rank/Position Title"
        value={form.staffCurrentRankPosition}
        onChange={(v) => update("staffCurrentRankPosition", v)}
      />

      <ShortAnswer
        required
        label="Years of Experience"
        type="number"
        value={form.staffYearsOfExperience}
        onChange={(v) => update("staffYearsOfExperience", v)}
      />

      <Paragraph
        required
        label="Purpose of Staff Mobility"
        rows={5}
        value={form.staffMobilityPurpose}
        onChange={(v) => update("staffMobilityPurpose", v)}
      />

      <Paragraph
        label="Proposed Work Plan"
        description="Maximum 500 words."
        rows={8}
        maxWords={500}
        value={form.staffProposedWorkPlan}
        onChange={(v) => update("staffProposedWorkPlan", v)}
      />

      <Paragraph
        required
        label="Expected Benefits to Home Institution and individuals"
        description="Maximum 300 words."
        rows={6}
        maxWords={300}
        value={form.staffExpectedBenefits}
        onChange={(v) => update("staffExpectedBenefits", v)}
      />
    </div>
  );
}

function SectionKLanguagePanel({
  form,
  update,
  languageCertificatePreview,
  languageCertificateFileName,
  setLanguageCertificatePreview,
  setLanguageCertificateFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  languageCertificatePreview: string | null;
  languageCertificateFileName: string | null;
  setLanguageCertificatePreview: (url: string | null) => void;
  setLanguageCertificateFileName: (name: string | null) => void;
}) {
  const hasCertificate = form.hasLanguageProficiencyCertificate === "Yes";
  const documentAccept =
    "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const clearLanguageCertificate = () => {
    if (languageCertificatePreview) {
      URL.revokeObjectURL(languageCertificatePreview);
    }
    setLanguageCertificatePreview(null);
    setLanguageCertificateFileName(null);
  };

  const handleCertificateQuestionChange = (value: string) => {
    update("hasLanguageProficiencyCertificate", value);
    if (value === "No") clearLanguageCertificate();
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION K: Language Proficiency
        </h3>
      </div>

      <ShortAnswer
        required
        label="Language of Instruction at Home Institution"
        value={form.homeInstructionLanguage}
        onChange={(v) => update("homeInstructionLanguage", v)}
      />

      <MultipleChoice
        required
        label="Do you possess an English language proficiency certification?"
        name="hasLanguageProficiencyCertificate"
        options={["Yes", "No"]}
        value={form.hasLanguageProficiencyCertificate}
        onChange={handleCertificateQuestionChange}
      />

      {hasCertificate && (
        <DocumentUpload
          required
          label="Upload Language Certificate"
          description="Upload 1 supported file: PDF, document, or image. Max 10 MB."
          accept={documentAccept}
          maxSizeMb={10}
          preview={languageCertificatePreview}
          fileName={languageCertificateFileName}
          documentField="languageCertificate"
          onFileSelect={(file, previewUrl, storedName) => {
            if (languageCertificatePreview) {
              URL.revokeObjectURL(languageCertificatePreview);
            }
            setLanguageCertificatePreview(previewUrl);
            setLanguageCertificateFileName(storedName ?? file.name);
          }}
          onClear={clearLanguageCertificate}
        />
      )}
    </div>
  );
}

function SectionLReferencesPanel({
  form,
  update,
  referenceLettersPreview,
  referenceLettersFileName,
  setReferenceLettersPreview,
  setReferenceLettersFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  referenceLettersPreview: string | null;
  referenceLettersFileName: string | null;
  setReferenceLettersPreview: (url: string | null) => void;
  setReferenceLettersFileName: (name: string | null) => void;
}) {
  const referenceLettersAccept =
    "application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION L: References (All Applicants)
        </h3>
      </div>

      <div className="space-y-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:p-6">
        <h4 className="text-sm font-semibold text-[#062763] sm:text-base">
          Referee 1
        </h4>
        <div className="space-y-6">
          <ShortAnswer
            label="Name of Referee 1"
            value={form.referee1Name}
            onChange={(v) => update("referee1Name", v)}
          />
          <SelectField
            required
            label="Relationship with Referee 1"
            value={form.referee1Relationship}
            onChange={(v) => update("referee1Relationship", v)}
            options={refereeRelationshipOptions}
            placeholder="Select relationship"
          />
          <ShortAnswer
            label="Position of Referee 1"
            value={form.referee1Position}
            onChange={(v) => update("referee1Position", v)}
          />
          <ShortAnswer
            required
            label="Institution of Referee 1"
            value={form.referee1Institution}
            onChange={(v) => update("referee1Institution", v)}
          />
          <ShortAnswer
            required
            label="Official Email Address of Referee 1"
            type="email"
            value={form.referee1Email}
            onChange={(v) => update("referee1Email", v)}
          />
          <ShortAnswer
            required
            label="Phone number of Referee 1"
            type="tel"
            value={form.referee1Phone}
            onChange={(v) => update("referee1Phone", v)}
          />
        </div>
      </div>

      <div className="space-y-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:p-6">
        <h4 className="text-sm font-semibold text-[#062763] sm:text-base">
          Referee 2
        </h4>
        <div className="space-y-6">
          <ShortAnswer
            label="Name of Referee 2"
            value={form.referee2Name}
            onChange={(v) => update("referee2Name", v)}
          />
          <SelectField
            label="Relationship with Referee 2"
            value={form.referee2Relationship}
            onChange={(v) => update("referee2Relationship", v)}
            options={refereeRelationshipOptions}
            placeholder="Select relationship"
          />
          <ShortAnswer
            label="Position of Referee 2"
            value={form.referee2Position}
            onChange={(v) => update("referee2Position", v)}
          />
          <ShortAnswer
            required
            label="Institution of Referee 2"
            value={form.referee2Institution}
            onChange={(v) => update("referee2Institution", v)}
          />
          <ShortAnswer
            required
            label="Official Email Address of Referee 2"
            type="email"
            value={form.referee2Email}
            onChange={(v) => update("referee2Email", v)}
          />
          <ShortAnswer
            required
            label="Phone number of Referee 2"
            type="tel"
            value={form.referee2Phone}
            onChange={(v) => update("referee2Phone", v)}
          />
        </div>
      </div>

      <DocumentUpload
        required
        label="Upload Reference Letters"
        description="Merge both letters as one PDF. Upload 1 supported file: PDF or document. Max 10 MB."
        accept={referenceLettersAccept}
        maxSizeMb={10}
        preview={referenceLettersPreview}
        fileName={referenceLettersFileName}
        documentField="referenceLetters"
        onFileSelect={(file, previewUrl, storedName) => {
          if (referenceLettersPreview) {
            URL.revokeObjectURL(referenceLettersPreview);
          }
          setReferenceLettersPreview(previewUrl);
          setReferenceLettersFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (referenceLettersPreview) {
            URL.revokeObjectURL(referenceLettersPreview);
          }
          setReferenceLettersPreview(null);
          setReferenceLettersFileName(null);
        }}
      />
    </div>
  );
}

function SectionMAdditionalDocumentsPanel({
  form,
  graduateAdmissionProofPreview,
  graduateAdmissionProofFileName,
  setGraduateAdmissionProofPreview,
  setGraduateAdmissionProofFileName,
  staffEmploymentProofPreview,
  staffEmploymentProofFileName,
  setStaffEmploymentProofPreview,
  setStaffEmploymentProofFileName,
  staffHostCommitmentPreview,
  staffHostCommitmentLetterFileName,
  setStaffHostCommitmentPreview,
  setStaffHostCommitmentLetterFileName,
  medicalFitnessPreview,
  medicalFitnessDeclarationFileName,
  setMedicalFitnessPreview,
  setMedicalFitnessDeclarationFileName,
}: {
  form: typeof initialForm;
  graduateAdmissionProofPreview: string | null;
  graduateAdmissionProofFileName: string | null;
  setGraduateAdmissionProofPreview: (url: string | null) => void;
  setGraduateAdmissionProofFileName: (name: string | null) => void;
  staffEmploymentProofPreview: string | null;
  staffEmploymentProofFileName: string | null;
  setStaffEmploymentProofPreview: (url: string | null) => void;
  setStaffEmploymentProofFileName: (name: string | null) => void;
  staffHostCommitmentPreview: string | null;
  staffHostCommitmentLetterFileName: string | null;
  setStaffHostCommitmentPreview: (url: string | null) => void;
  setStaffHostCommitmentLetterFileName: (name: string | null) => void;
  medicalFitnessPreview: string | null;
  medicalFitnessDeclarationFileName: string | null;
  setMedicalFitnessPreview: (url: string | null) => void;
  setMedicalFitnessDeclarationFileName: (name: string | null) => void;
}) {
  const documentAccept =
    "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const degreeSeeking = isDegreeSeeking(form.typeOfMobility);
  const staffMobility = isStaffMobilityApplicant(form.typeOfMobility);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION M: Upload of Additional Support Documents
        </h3>
      </div>

      {degreeSeeking && (
        <DocumentUpload
          required
          label="Upload valid proof of application for admission to relevant graduate Programme at SMECC2E partner institution outside your country"
          description="For Masters and PhD degree seeking applicants only. Upload 1 supported file: PDF, document, or image. Max 1 MB."
          accept={documentAccept}
          maxSizeMb={1}
          preview={graduateAdmissionProofPreview}
          fileName={graduateAdmissionProofFileName}
          documentField="graduateAdmissionProof"
          onFileSelect={(file, previewUrl, storedName) => {
            if (graduateAdmissionProofPreview) {
              URL.revokeObjectURL(graduateAdmissionProofPreview);
            }
            setGraduateAdmissionProofPreview(previewUrl);
            setGraduateAdmissionProofFileName(storedName ?? file.name);
          }}
          onClear={() => {
            if (graduateAdmissionProofPreview) {
              URL.revokeObjectURL(graduateAdmissionProofPreview);
            }
            setGraduateAdmissionProofPreview(null);
            setGraduateAdmissionProofFileName(null);
          }}
        />
      )}

      {staffMobility && (
        <>
          <DocumentUpload
            required
            label="Upload proof of employment at partner HEI"
            description="For Staff mobility applicants only. Upload 1 supported file: PDF, document, or image. Max 10 MB."
            accept={documentAccept}
            maxSizeMb={10}
            preview={staffEmploymentProofPreview}
            fileName={staffEmploymentProofFileName}
            documentField="staffEmploymentProof"
            onFileSelect={(file, previewUrl, storedName) => {
              if (staffEmploymentProofPreview) {
                URL.revokeObjectURL(staffEmploymentProofPreview);
              }
              setStaffEmploymentProofPreview(previewUrl);
              setStaffEmploymentProofFileName(storedName ?? file.name);
            }}
            onClear={() => {
              if (staffEmploymentProofPreview) {
                URL.revokeObjectURL(staffEmploymentProofPreview);
              }
              setStaffEmploymentProofPreview(null);
              setStaffEmploymentProofFileName(null);
            }}
          />

          <DocumentUpload
            required
            label="Letter of Commitment/Support from host HEI"
            description="For staff mobility only. Upload 1 supported file: PDF, document, or image. Max 10 MB."
            accept={documentAccept}
            maxSizeMb={10}
            preview={staffHostCommitmentPreview}
            fileName={staffHostCommitmentLetterFileName}
            documentField="staffHostCommitmentLetter"
            onFileSelect={(file, previewUrl, storedName) => {
              if (staffHostCommitmentPreview) {
                URL.revokeObjectURL(staffHostCommitmentPreview);
              }
              setStaffHostCommitmentPreview(previewUrl);
              setStaffHostCommitmentLetterFileName(storedName ?? file.name);
            }}
            onClear={() => {
              if (staffHostCommitmentPreview) {
                URL.revokeObjectURL(staffHostCommitmentPreview);
              }
              setStaffHostCommitmentPreview(null);
              setStaffHostCommitmentLetterFileName(null);
            }}
          />
        </>
      )}

      <DocumentUpload
        required
        label="Upload the Declaration of Medical Fitness"
        description="Upload 1 supported file: PDF, document, or image. Max 10 MB."
        accept={documentAccept}
        maxSizeMb={10}
        preview={medicalFitnessPreview}
        fileName={medicalFitnessDeclarationFileName}
        documentField="medicalFitnessDeclaration"
        onFileSelect={(file, previewUrl, storedName) => {
          if (medicalFitnessPreview) {
            URL.revokeObjectURL(medicalFitnessPreview);
          }
          setMedicalFitnessPreview(previewUrl);
          setMedicalFitnessDeclarationFileName(storedName ?? file.name);
        }}
        onClear={() => {
          if (medicalFitnessPreview) {
            URL.revokeObjectURL(medicalFitnessPreview);
          }
          setMedicalFitnessPreview(null);
          setMedicalFitnessDeclarationFileName(null);
        }}
      />
    </div>
  );
}

function SectionNScholarshipPanel({
  form,
  update,
  previousScholarshipDeclarationPreview,
  previousScholarshipDeclarationFileName,
  setPreviousScholarshipDeclarationPreview,
  setPreviousScholarshipDeclarationFileName,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
  previousScholarshipDeclarationPreview: string | null;
  previousScholarshipDeclarationFileName: string | null;
  setPreviousScholarshipDeclarationPreview: (url: string | null) => void;
  setPreviousScholarshipDeclarationFileName: (name: string | null) => void;
}) {
  const hadPreviousScholarship = form.previousIntraAfricaScholarship === "Yes";
  const declarationAccept =
    "application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const clearDeclarationUpload = () => {
    if (previousScholarshipDeclarationPreview) {
      URL.revokeObjectURL(previousScholarshipDeclarationPreview);
    }
    setPreviousScholarshipDeclarationPreview(null);
    setPreviousScholarshipDeclarationFileName(null);
  };

  const handlePreviousScholarshipChange = (value: string) => {
    update("previousIntraAfricaScholarship", value);
    if (value === "No") clearDeclarationUpload();
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION N: Previous Scholarship Declaration
        </h3>
      </div>

      <MultipleChoice
        required
        label="Have you previously benefited from an Intra-Africa/ACP scholarship?"
        name="previousIntraAfricaScholarship"
        options={["Yes", "No"]}
        value={form.previousIntraAfricaScholarship}
        onChange={handlePreviousScholarshipChange}
      />

      {hadPreviousScholarship && (
        <DocumentUpload
          required
          label="Please upload the previous Intra-Africa/ACP scholarship declaration form"
          description="Upload 1 supported file: PDF or document. Max 1 MB."
          accept={declarationAccept}
          maxSizeMb={1}
          preview={previousScholarshipDeclarationPreview}
          fileName={previousScholarshipDeclarationFileName}
          documentField="previousScholarshipDeclaration"
          onFileSelect={(file, previewUrl, storedName) => {
            if (previousScholarshipDeclarationPreview) {
              URL.revokeObjectURL(previousScholarshipDeclarationPreview);
            }
            setPreviousScholarshipDeclarationPreview(previewUrl);
            setPreviousScholarshipDeclarationFileName(storedName ?? file.name);
          }}
          onClear={clearDeclarationUpload}
        />
      )}
    </div>
  );
}

function PlaceholderPage({ page }: { page: number }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-[#062763]">
        Page {page} — {pageTitles[page]}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        This section will be completed in a future update. Use Next to continue
        your application.
      </p>
    </div>
  );
}

function SectionODeclarationPanel({
  form,
  update,
}: {
  form: typeof initialForm;
  update: (field: keyof typeof initialForm, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#062763] sm:text-lg">
          SECTION O: Declaration &amp; Consent
        </h3>
      </div>

      <fieldset>
        <legend className="sr-only">Declaration</legend>
        <div className={fieldOptionsBoxClass}>
          <label className={fieldOptionLabelClass}>
            <input
              type="checkbox"
              required
              checked={form.declarationCertified}
              onChange={(e) => update("declarationCertified", e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded accent-[#062763]"
            />
            <span>
              Declaration — I certify that the information provided is true and
              complete. If the information provided is found to be false, then
              my application should be disqualified.
              <RequiredMark required />
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">Data protection consent</legend>
        <div className={fieldOptionsBoxClass}>
          <label className={fieldOptionLabelClass}>
            <input
              type="checkbox"
              required
              checked={form.dataProtectionConsent}
              onChange={(e) => update("dataProtectionConsent", e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded accent-[#062763]"
            />
            <span>
              Data Protection Consent — I consent to SMECC2E processing my data
              for scholarship purposes.
              <RequiredMark required />
            </span>
          </label>
        </div>
      </fieldset>

      <ShortAnswer
        required
        label="Signature — Type full names"
        value={form.applicantSignature}
        onChange={(v) => update("applicantSignature", v)}
      />
    </div>
  );
}

function ReviewPanel({
  form,
  profilePreview,
  passportFileName,
  disadvantagedDocFileName,
  academicCertificatesFileName,
  academicTranscriptsFileName,
  proofOfRegistrationFileName,
  proofOfCourseworkFileName,
  cvFileName,
  publicationsFileName,
  studyResearchPlanFileName,
  researchProposalFileName,
  languageCertificateFileName,
  referenceLettersFileName,
  graduateAdmissionProofFileName,
  staffEmploymentProofFileName,
  staffHostCommitmentLetterFileName,
  medicalFitnessDeclarationFileName,
  previousScholarshipDeclarationFileName,
}: {
  form: typeof initialForm;
  profilePreview: string | null;
  passportFileName: string | null;
  disadvantagedDocFileName: string | null;
  academicCertificatesFileName: string | null;
  academicTranscriptsFileName: string | null;
  proofOfRegistrationFileName: string | null;
  proofOfCourseworkFileName: string | null;
  cvFileName: string | null;
  publicationsFileName: string | null;
  studyResearchPlanFileName: string | null;
  researchProposalFileName: string | null;
  languageCertificateFileName: string | null;
  referenceLettersFileName: string | null;
  graduateAdmissionProofFileName: string | null;
  staffEmploymentProofFileName: string | null;
  staffHostCommitmentLetterFileName: string | null;
  medicalFitnessDeclarationFileName: string | null;
  previousScholarshipDeclarationFileName: string | null;
}) {
  return (
    <div className="space-y-4 text-sm text-slate-700 sm:text-base">
      <p className="font-semibold text-[#062763]">
        Review your answers before submitting.
      </p>
      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        <ReviewRow label="Email address" value={form.email} />
        <ReviewRow
          label="Profile picture"
          value={profilePreview ? "Uploaded" : "Not provided"}
        />
        <ReviewRow label="Nationality" value={form.nationality} />
        <ReviewRow label="Country of residence" value={form.countryOfResidence} />
        <ReviewRow label="Region" value={form.region} />
        <ReviewRow label="Type of mobility" value={form.typeOfMobility} />
        <ReviewRow
          label="Preferred host institution"
          value={form.preferredHostInstitution}
        />
        {isMastersOrPhd(form.typeOfMobility) && (
          <ReviewRow label="Thematic area" value={form.thematicArea} />
        )}
        {isMastersOrPhd(form.typeOfMobility) && (
          <ReviewRow
            label="Proposed academic programme"
            value={form.proposedAcademicProgramme}
          />
        )}
        <ReviewRow
          label="Full name"
          value={[form.surname, form.firstName, form.middleName]
            .filter(Boolean)
            .join(" ")}
        />
        <ReviewRow label="Gender" value={form.gender} />
        <ReviewRow label="Date of birth" value={form.dateOfBirth} />
        <ReviewRow label="State/Province" value={form.stateProvince} />
        <ReviewRow label="Home address" value={form.homeAddress} />
        <ReviewRow label="Personal email" value={form.personalEmail} />
        <ReviewRow label="Phone number" value={form.phoneNumber} />
        <ReviewRow label="LinkedIn" value={form.linkedinUrl} />
        <ReviewRow
          label="Other social media"
          value={form.socialMediaUrl}
        />
        <ReviewRow
          label="Passport / National ID"
          value={form.passportOrIdNumber}
        />
        <ReviewRow
          label="Passport / ID document"
          value={passportFileName ?? "Not uploaded"}
        />
        <ReviewRow label="Next of kin" value={form.nextOfKinName} />
        <ReviewRow
          label="Next of kin WhatsApp"
          value={form.nextOfKinWhatsapp}
        />
        <ReviewRow label="Next of kin email" value={form.nextOfKinEmail} />
        <ReviewRow
          label="Next of kin relationship"
          value={form.nextOfKinRelationship}
        />
        <ReviewRow
          label="Disadvantaged group"
          value={form.belongsToDisadvantagedGroup}
        />
        {form.belongsToDisadvantagedGroup === "Yes" && (
          <>
            <ReviewRow
              label="Disadvantaged categories"
              value={formatDisadvantagedCategories(form)}
            />
            <ReviewRow
              label="Supporting documents"
              value={disadvantagedDocFileName ?? "Not uploaded"}
            />
          </>
        )}
        <ReviewRow
          label="Educational qualifications"
          value={formatEducationalQualifications(form)}
        />
        {form.eduBachelor && (
          <>
            <ReviewRow
              label="Bachelor programme & university"
              value={form.bachelorProgrammeUniversity}
            />
            <ReviewRow label="Bachelor CGPA" value={form.bachelorCgpa} />
          </>
        )}
        {form.eduMaster && (
          <>
            <ReviewRow
              label="Master programme & university"
              value={form.masterProgrammeUniversity}
            />
            <ReviewRow label="Master CGPA" value={form.masterCgpa} />
          </>
        )}
        <ReviewRow
          label="Academic certificates"
          value={academicCertificatesFileName ?? "Not uploaded"}
        />
        <ReviewRow
          label="Academic transcripts"
          value={academicTranscriptsFileName ?? "Not uploaded"}
        />
        {isCreditSeeking(form.typeOfMobility) && (
          <>
            <ReviewRow
              label="Currently enrolled in degree programme"
              value={form.currentlyEnrolledInDegree}
            />
            <ReviewRow
              label="Registration number"
              value={form.registrationNumber}
            />
            <ReviewRow
              label="Proof of registration"
              value={proofOfRegistrationFileName ?? "Not uploaded"}
            />
            <ReviewRow
              label="Proof of coursework completion"
              value={proofOfCourseworkFileName ?? "Not uploaded"}
            />
          </>
        )}
        <ReviewRow
          label="Curriculum vitae"
          value={cvFileName ?? "Not uploaded"}
        />
        <ReviewRow
          label="Publications"
          value={publicationsFileName ?? "Not uploaded"}
        />
        <ReviewRow
          label={`Why applying for SMECC2E Scholarship (${countWords(form.whyApplyingScholarship)} words)`}
          value={form.whyApplyingScholarship}
        />
        <ReviewRow
          label={`Background & thematic area alignment (${countWords(form.backgroundThematicAlignment)} words)`}
          value={form.backgroundThematicAlignment}
        />
        <ReviewRow
          label={`Scholarship & academic/career goals (${countWords(form.scholarshipCareerGoals)} words)`}
          value={form.scholarshipCareerGoals}
        />
        <ReviewRow
          label={`Africa clean energy & climate contribution (${countWords(form.africaCleanEnergyContribution)} words)`}
          value={form.africaCleanEnergyContribution}
        />
        {isCreditSeeking(form.typeOfMobility) && (
          <ReviewRow
            label="Study/research plan"
            value={studyResearchPlanFileName ?? "Not uploaded"}
          />
        )}
        {isDegreeSeeking(form.typeOfMobility) && (
          <ReviewRow
            label="Research proposal"
            value={researchProposalFileName ?? "Not uploaded"}
          />
        )}
        {isTraineeshipApplicant(form.typeOfMobility) && (
          <>
            <ReviewRow
              label="Preferred industry sector"
              value={form.traineePreferredIndustrySector}
            />
            <ReviewRow
              label="Relevant skills for traineeship"
              value={form.traineeshipRelevantSkills}
            />
            <ReviewRow
              label="Career interest area"
              value={form.traineeshipCareerInterestArea}
            />
            <ReviewRow
              label="Current programme type"
              value={form.traineeshipCurrentProgrammeType}
            />
            <ReviewRow
              label="Current position"
              value={form.traineeshipCurrentPosition}
            />
          </>
        )}
        {isStaffMobilityApplicant(form.typeOfMobility) && (
          <>
            <ReviewRow
              label="Organizations worked with"
              value={form.staffOrganizationsWorkedWith}
            />
            <ReviewRow
              label="Current rank/position title"
              value={form.staffCurrentRankPosition}
            />
            <ReviewRow
              label="Years of experience"
              value={form.staffYearsOfExperience}
            />
            <ReviewRow
              label="Purpose of staff mobility"
              value={form.staffMobilityPurpose}
            />
            <ReviewRow
              label={`Proposed work plan (${countWords(form.staffProposedWorkPlan)} words)`}
              value={form.staffProposedWorkPlan}
            />
            <ReviewRow
              label={`Expected benefits (${countWords(form.staffExpectedBenefits)} words)`}
              value={form.staffExpectedBenefits}
            />
          </>
        )}
        <ReviewRow
          label="Language of instruction at home institution"
          value={form.homeInstructionLanguage}
        />
        <ReviewRow
          label="Language proficiency certificates"
          value={form.hasLanguageProficiencyCertificate}
        />
        {form.hasLanguageProficiencyCertificate === "Yes" && (
          <ReviewRow
            label="Language certificate"
            value={languageCertificateFileName ?? "Not uploaded"}
          />
        )}
        <ReviewRow
          label="Referee 1"
          value={formatRefereeSummary(
            form.referee1Name,
            form.referee1Relationship,
            form.referee1Institution,
            form.referee1Email
          )}
        />
        <ReviewRow
          label="Referee 2"
          value={formatRefereeSummary(
            form.referee2Name,
            form.referee2Relationship,
            form.referee2Institution,
            form.referee2Email
          )}
        />
        <ReviewRow
          label="Reference letters"
          value={referenceLettersFileName ?? "Not uploaded"}
        />
        {isDegreeSeeking(form.typeOfMobility) && (
          <ReviewRow
            label="Graduate admission application proof"
            value={graduateAdmissionProofFileName ?? "Not uploaded"}
          />
        )}
        {isStaffMobilityApplicant(form.typeOfMobility) && (
          <>
            <ReviewRow
              label="Proof of employment at partner HEI"
              value={staffEmploymentProofFileName ?? "Not uploaded"}
            />
            <ReviewRow
              label="Host HEI commitment/support letter"
              value={staffHostCommitmentLetterFileName ?? "Not uploaded"}
            />
          </>
        )}
        <ReviewRow
          label="Declaration of medical fitness"
          value={medicalFitnessDeclarationFileName ?? "Not uploaded"}
        />
        <ReviewRow
          label="Previous Intra-Africa/ACP scholarship"
          value={form.previousIntraAfricaScholarship}
        />
        {form.previousIntraAfricaScholarship === "Yes" && (
          <ReviewRow
            label="Previous scholarship declaration form"
            value={previousScholarshipDeclarationFileName ?? "Not uploaded"}
          />
        )}
        <ReviewRow
          label="Declaration certified"
          value={form.declarationCertified ? "Yes" : "No"}
        />
        <ReviewRow
          label="Data protection consent"
          value={form.dataProtectionConsent ? "Yes" : "No"}
        />
        <ReviewRow label="Signature (typed full name)" value={form.applicantSignature} />
      </dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-[#062763]">{value || "—"}</dd>
    </div>
  );
}

function InstructionsPanel({
  accepted,
  onAcceptedChange,
}: {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
}) {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [guidelinesEngaged, setGuidelinesEngaged] = useState(false);

  const markGuidelinesEngaged = useCallback(() => {
    setGuidelinesEngaged(true);
  }, []);

  const openGuidelines = () => {
    setGuidelinesOpen(true);
  };

  return (
    <div className="space-y-6 text-sm leading-7 text-slate-600 sm:space-y-8 sm:text-base">
      <div>
        <h2 className="text-lg font-bold text-[#062763] sm:text-xl">
          SMECC2E Intra-Africa Mobility Scholarship Application Form
        </h2>
        <p className="mt-4 font-semibold text-[#062763]">
          Dear Prospective Applicant,
        </p>
      </div>

      <p>
        Welcome to the application portal for the Sustainable Energy &amp;
        Materials, Energy Policy, Climate Change, Energy Economics and Environment
        (SMECC2E) Intra-Africa Mobility Project.
      </p>

      <p>
        Thank you for your interest in the SMECC2E scholarship programme. This
        application form is designed for applicants seeking opportunities under
        the following mobility categories:{" "}
        <strong>
          MSc Degree-Seeking, MSc Credit-Seeking, PhD Degree-Seeking, PhD
          Credit-Seeking, Traineeship Mobility, and Staff Mobility
        </strong>
        .
      </p>

      <p>
        Before proceeding, kindly read the scholarship call guidelines carefully
        to confirm your eligibility, understand the required documents, and select
        the most appropriate mobility category and thematic area. Applicants are
        advised to prepare all mandatory supporting documents in advance,
        including academic transcripts, certificates, curriculum vitae,
        motivation letter, recommendation letters, research proposal or study plan
        (where applicable), proof of registration (for credit-seeking
        applicants), proof of application for admission into your preferred HEI
        amongst the SMECC2E partner HEIs (for degree-seeking applicants), and any
        additional supporting documents.
      </p>

      <p>
        Please complete all sections accurately and ensure that the information
        provided is correct and verifiable. Incomplete applications, missing
        mandatory documents, or false declarations may result in
        disqualification. You may save your progress and return later if the
        platform permits.
      </p>

      <p>
        The SMECC2E Project promotes academic excellence, transparency,
        inclusiveness, gender balance, and equal opportunity. Women and candidates
        from disadvantaged backgrounds are strongly encouraged to apply.
      </p>

      <p>
        For enquiries or technical support, please contact the SMECC2E Project
        Team through the official communication channels provided in the call
        announcement.
      </p>

      <div className="rounded-lg border border-[#f7be2a]/40 bg-[#f7be2a]/10 px-4 py-4 font-semibold text-[#062763]">
        Please remember the deadline for application is{" "}
        <span className="text-[#062763]">16th July 2026</span>.
      </div>

      <p>We wish you success in your application.</p>

      <div className="space-y-1 border-t border-slate-200 pt-6 text-slate-700">
        <p className="font-semibold text-[#062763]">Signed</p>
        <p>SMECC2E Scholarship Selection Committee</p>
        <p className="mt-4 font-semibold text-[#062763]">
          For more information visit:
        </p>
        <p>
          Website:{" "}
          <a
            href="https://smecc2e.unn.edu.ng"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#062763] underline hover:text-[#0a3a8a]"
          >
            smecc2e.unn.edu.ng
          </a>
        </p>
        <p>
          Email:{" "}
          <a
            href="mailto:smecc2e@unn.edu.ng"
            className="font-medium text-[#062763] underline hover:text-[#0a3a8a]"
          >
            smecc2e@unn.edu.ng
          </a>
        </p>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-6 text-center">
        <p className="text-base font-black uppercase tracking-wide text-red-600 sm:text-lg">
          Application guidelines
        </p>
        <button
          type="button"
          onClick={() =>
            guidelinesOpen ? setGuidelinesOpen(false) : openGuidelines()
          }
          className="mx-auto inline-flex items-center justify-center gap-2 text-base font-black text-red-600 underline decoration-red-400 underline-offset-4 hover:text-red-700 sm:text-lg"
          aria-expanded={guidelinesOpen}
          aria-controls="application-guidelines-panel"
        >
          {guidelinesOpen ? "Hide application guidelines" : "View application guidelines (PDF)"}
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${guidelinesOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {guidelinesOpen && (
          <div
            id="application-guidelines-panel"
            className="overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-sm"
          >
            <GuidelinesPdfViewer
              src={APPLICATION_GUIDELINE_PDF}
              onScrolledToEnd={markGuidelinesEngaged}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>Or access the PDF directly:</span>
              <a
                href={APPLICATION_GUIDELINE_PDF}
                download={APPLICATION_GUIDELINE_DOWNLOAD_NAME}
                onClick={markGuidelinesEngaged}
                className="font-semibold text-[#062763] underline hover:text-[#0a3a8a]"
              >
                Download guidelines
              </a>
              <a
                href={APPLICATION_GUIDELINE_PDF}
                target="_blank"
                rel="noopener noreferrer"
                onClick={markGuidelinesEngaged}
                className="font-semibold text-[#062763] underline hover:text-[#0a3a8a]"
              >
                Open in browser
              </a>
            </div>
          </div>
        )}
      </div>

      <div className={fieldOptionsBoxClass}>
        <label
          className={`${fieldOptionLabelClass} ${!guidelinesEngaged ? "opacity-60" : ""}`}
        >
          <input
            type="checkbox"
            checked={accepted}
            disabled={!guidelinesEngaged}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded accent-[#062763] disabled:cursor-not-allowed"
          />
          <span>
            I have read the guidelines for application
            <span className="text-red-600"> *</span>
          </span>
        </label>
        {!guidelinesEngaged && (
          <p className="mt-2 text-xs font-medium text-slate-600">
            Scroll through the full guidelines above, or use download / open in browser,
            before confirming that you have read them.
          </p>
        )}
      </div>
    </div>
  );
}

function FormHeader() {
  return (
    <div className="border-b-4 border-[#f7be2a] bg-[#062763]">
      <Image
        src="/images/banner.png"
        alt="SMECC2E — Cross Regional Intra-Africa Mobility Project, funded by the European Union"
        width={1600}
        height={272}
        className="h-auto w-full object-contain"
        priority
      />
      <p className="px-6 py-2 text-center text-xs text-blue-50/80 sm:text-sm">
        <span className="text-red-300">*</span> Indicates required question
      </p>
    </div>
  );
}

function RequiredMark({ required }: { required?: boolean }) {
  if (!required) return null;
  return <span className="ml-0.5 text-red-600">*</span>;
}

const fieldInputClass =
  "mt-3 w-full rounded-lg border-2 border-[#062763]/35 bg-[#eef2f7] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition hover:border-[#062763]/55 hover:bg-[#e8eef5] focus:border-[#062763] focus:bg-white focus:ring-2 focus:ring-[#062763]/25 sm:text-base";

const fieldOptionsBoxClass =
  "mt-3 space-y-2 rounded-lg border-2 border-[#062763]/35 bg-[#eef2f7] p-3 sm:p-4";

const fieldOptionLabelClass =
  "flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[#062763]/25 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-[#062763]/45 hover:bg-[#f8fafc] has-[:checked]:border-[#062763] has-[:checked]:bg-white has-[:checked]:ring-2 has-[:checked]:ring-[#062763]/20 sm:text-base";

const fieldUploadZoneClass =
  "mt-3 rounded-lg border-2 border-dashed border-[#062763]/40 bg-[#eef2f7] p-4 sm:p-5";

function filterNumericDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function ShortAnswer({
  label,
  value,
  onChange,
  required,
  type = "text",
  description,
  disabled,
  numericOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  description?: string;
  disabled?: boolean;
  numericOnly?: boolean;
}) {
  const inputType = numericOnly ? "text" : type;
  const inputMode = numericOnly ? "decimal" : undefined;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-800 sm:text-base">
        {label}
        <RequiredMark required={required} />
      </label>
      {description && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
      )}
      <input
        type={inputType}
        inputMode={inputMode}
        pattern={numericOnly ? "[0-9.]*" : undefined}
        required={required}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            numericOnly ? filterNumericDecimalInput(e.target.value) : e.target.value
          )
        }
        onKeyDown={
          numericOnly
            ? (e) => {
                const control = [
                  "Backspace",
                  "Delete",
                  "Tab",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ];
                if (control.includes(e.key) || e.ctrlKey || e.metaKey) return;
                if (e.key === "." && !value.includes(".")) return;
                if (/^\d$/.test(e.key)) return;
                e.preventDefault();
              }
            : undefined
        }
        onPaste={
          numericOnly
            ? (e) => {
                e.preventDefault();
                onChange(
                  filterNumericDecimalInput(e.clipboardData.getData("text"))
                );
              }
            : undefined
        }
        className={`${fieldInputClass} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      />
    </div>
  );
}

function MultipleChoice({
  label,
  name,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800 sm:text-base">
        {label}
        <RequiredMark required={required} />
      </legend>
      <div className={fieldOptionsBoxClass}>
        {options.map((option) => (
          <label key={option} className={fieldOptionLabelClass}>
            <input
              type="radio"
              name={name}
              required={required}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#062763]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  description,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-800 sm:text-base">
        {label}
        <RequiredMark required={required} />
      </label>
      {description && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
      )}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldInputClass} text-[#062763] ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23062763'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "1.25rem",
          paddingRight: "2.5rem",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Paragraph({
  label,
  value,
  onChange,
  required,
  description,
  rows = 5,
  maxWords,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  rows?: number;
  maxWords?: number;
}) {
  const wordCount = countWords(value);
  const wordsRemaining =
    maxWords !== undefined ? Math.max(0, maxWords - wordCount) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-800 sm:text-base">
        {label}
        <RequiredMark required={required} />
      </label>
      {description && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
      )}
      <textarea
        required={required}
        rows={rows}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (maxWords && countWords(next) > maxWords) return;
          onChange(next);
        }}
        className={`${fieldInputClass} resize-y`}
      />
      {wordsRemaining !== null && (
        <p
          className={`mt-1.5 text-right text-xs font-semibold sm:text-sm ${
            wordsRemaining === 0
              ? "text-red-600"
              : wordsRemaining <= 20
                ? "text-amber-700"
                : "text-slate-500"
          }`}
          aria-live="polite"
        >
          {wordsRemaining} {wordsRemaining === 1 ? "word" : "words"} remaining
          <span className="font-medium text-slate-400">
            {" "}
            ({wordCount} / {maxWords})
          </span>
        </p>
      )}
    </div>
  );
}

function DocumentUpload({
  label,
  description,
  accept,
  maxSizeMb,
  preview,
  fileName,
  onFileSelect,
  onClear,
  required,
  documentField,
}: {
  label: string;
  description?: string;
  accept: string;
  maxSizeMb: number;
  preview: string | null;
  fileName: string | null;
  onFileSelect: ApplicationFileSelectHandler;
  onClear: () => void;
  required?: boolean;
  documentField?: ApplicationDocumentField;
}) {
  const uploadContext = useContext(ApplicationUploadContext);
  const isImage =
    preview &&
    fileName &&
    !fileName.toLowerCase().endsWith(".pdf");

  return (
    <div>
      <p className="text-sm font-medium text-slate-800 sm:text-base">
        {label}
        <RequiredMark required={required} />
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
      )}
      <div className={`${fieldUploadZoneClass} flex flex-wrap items-start gap-4`}>
        {isImage && preview ? (
          <div className="relative h-28 w-40 overflow-hidden rounded-lg border-2 border-[#062763]/35 bg-white">
            <Image
              src={preview}
              alt="Document preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : fileName ? (
          <div className="flex min-h-20 min-w-40 items-center justify-center rounded-lg border-2 border-[#062763]/35 bg-white px-4 py-3 text-sm font-semibold text-[#062763]">
            {fileName}
          </div>
        ) : (
          <div className="flex h-28 w-40 items-center justify-center rounded-lg border-2 border-dashed border-[#062763]/35 bg-white text-xs font-medium text-slate-600">
            No file
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="inline-block cursor-pointer rounded-lg border-2 border-[#062763] bg-white px-4 py-2.5 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5">
            Choose file
            <input
              type="file"
              accept={accept}
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > maxSizeMb * 1024 * 1024) {
                  alert(`File must be ${maxSizeMb} MB or smaller.`);
                  e.target.value = "";
                  return;
                }
                const previewUrl = file.type.startsWith("image/")
                  ? URL.createObjectURL(file)
                  : null;
                let storedName: string | undefined;
                if (documentField && uploadContext) {
                  try {
                    storedName = await uploadContext.uploadDocument(
                      documentField,
                      file
                    );
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Could not upload file. Save your progress and try again."
                    );
                    e.target.value = "";
                    return;
                  }
                }
                onFileSelect(file, previewUrl, storedName);
                e.target.value = "";
              }}
            />
          </label>
          {fileName && (
            <button
              type="button"
              onClick={onClear}
              className="text-left text-xs font-medium text-red-600 hover:underline"
            >
              Remove file
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfilePictureUpload({
  preview,
  onFileSelect,
  onClear,
}: {
  preview: string | null;
  onFileSelect: ApplicationFileSelectHandler;
  onClear: () => void;
}) {
  const uploadContext = useContext(ApplicationUploadContext);

  return (
    <div>
      <p className="text-sm font-medium text-slate-800 sm:text-base">
        Upload a profile picture
      </p>
      <div className={`${fieldUploadZoneClass} flex flex-wrap items-center gap-4`}>
        {preview ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#062763]/35 bg-white">
            <Image
              src={preview}
              alt="Profile preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#062763]/35 bg-white text-xs font-medium text-slate-600">
            No image
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="inline-block cursor-pointer rounded-lg border-2 border-[#062763] bg-white px-4 py-2.5 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5">
            Choose file
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const previewUrl = URL.createObjectURL(file);
                let storedName: string | undefined;
                if (uploadContext) {
                  try {
                    storedName = await uploadContext.uploadDocument(
                      "profile",
                      file
                    );
                  } catch (err) {
                    URL.revokeObjectURL(previewUrl);
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Could not upload profile picture. Save your progress and try again."
                    );
                    e.target.value = "";
                    return;
                  }
                }
                onFileSelect(file, previewUrl, storedName);
                e.target.value = "";
              }}
            />
          </label>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              className="text-left text-xs font-medium text-red-600 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Accepted formats: JPG, PNG, WEBP (max. 5MB recommended)
      </p>
    </div>
  );
}
