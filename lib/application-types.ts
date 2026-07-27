import type { EvaluatorEvaluationSubmission } from "./evaluator-evaluation-types";
import type { InterviewEvaluationSubmission } from "./interview-scoring-sheet";

export type ApplicationStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "evaluation"
  | "interview"
  | "final_evaluation"
  | "offered"
  | "reserved"
  | "approved"
  | "rejected"
  | "pre_departure";

export type EvaluatorReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "evaluated";

export type EvaluatorReviewAction =
  | "accept"
  | "reject"
  | "evaluate"
  | "save_evaluation"
  | "reset";

export type ApplicationPayload = {
  email: string;
  nationality: string;
  countryOfResidence: string;
  region: string;
  typeOfMobility: string;
  preferredHostInstitution: string;
  proposedAcademicProgramme: string;
  thematicArea: string;
  surname: string;
  firstName: string;
  middleName: string;
  gender: string;
  dateOfBirth: string;
  stateProvince: string;
  homeAddress: string;
  personalEmail: string;
  phoneNumber: string;
  linkedinUrl: string;
  socialMediaUrl: string;
  passportOrIdNumber: string;
  nextOfKinName: string;
  nextOfKinWhatsapp: string;
  nextOfKinEmail: string;
  nextOfKinRelationship: string;
  belongsToDisadvantagedGroup: string;
  disadvantagedFinancially: boolean;
  disadvantagedDisability: boolean;
  disadvantagedRefugee: boolean;
  disadvantagedConflict: boolean;
  disadvantagedMinority: boolean;
  disadvantagedOther: boolean;
  disadvantagedOtherSpecify: string;
  eduBachelor: boolean;
  eduMaster: boolean;
  eduPhd: boolean;
  bachelorProgrammeUniversity: string;
  bachelorCgpa: string;
  masterProgrammeUniversity: string;
  masterCgpa: string;
  profileUploaded?: boolean;
  passportFileName?: string | null;
  disadvantagedDocFileName?: string | null;
  academicCertificatesFileName?: string | null;
  academicTranscriptsFileName?: string | null;
  currentlyEnrolledInDegree?: string;
  registrationNumber?: string;
  proofOfRegistrationFileName?: string | null;
  proofOfCourseworkFileName?: string | null;
  whyApplyingScholarship?: string;
  cvFileName?: string | null;
  publicationsFileName?: string | null;
  backgroundThematicAlignment?: string;
  scholarshipCareerGoals?: string;
  africaCleanEnergyContribution?: string;
  studyResearchPlanFileName?: string | null;
  researchProposalFileName?: string | null;
  traineePreferredIndustrySector?: string;
  traineeshipRelevantSkills?: string;
  traineeshipCareerInterestArea?: string;
  traineeshipCurrentProgrammeType?: string;
  traineeshipCurrentPosition?: string;
  staffOrganizationsWorkedWith?: string;
  staffCurrentRankPosition?: string;
  staffYearsOfExperience?: string;
  staffMobilityPurpose?: string;
  staffProposedWorkPlan?: string;
  staffExpectedBenefits?: string;
  homeInstructionLanguage?: string;
  hasLanguageProficiencyCertificate?: string;
  languageCertificateFileName?: string | null;
  referee1Name?: string;
  referee1Relationship?: string;
  referee1Position?: string;
  referee1Institution?: string;
  referee1Email?: string;
  referee1Phone?: string;
  referee2Name?: string;
  referee2Relationship?: string;
  referee2Position?: string;
  referee2Institution?: string;
  referee2Email?: string;
  referee2Phone?: string;
  referenceLettersFileName?: string | null;
  graduateAdmissionProofFileName?: string | null;
  staffEmploymentProofFileName?: string | null;
  staffHostCommitmentLetterFileName?: string | null;
  medicalFitnessDeclarationFileName?: string | null;
  previousIntraAfricaScholarship?: string;
  previousScholarshipDeclarationFileName?: string | null;
  declarationCertified?: boolean;
  dataProtectionConsent?: boolean;
  applicantSignature?: string;
};

export type ApplicationRecord = ApplicationPayload & {
  id: string;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  /** Last completed step when status is draft */
  currentPage?: number;
  /** Assigned evaluator 1 public id (e.g. USR-001), if any */
  evaluator1Id?: string | null;
  evaluator1Name?: string | null;
  evaluator1Email?: string | null;
  /** Assigned evaluator 2 public id, if any */
  evaluator2Id?: string | null;
  evaluator2Name?: string | null;
  evaluator2Email?: string | null;
  evaluator1ReviewStatus?: EvaluatorReviewStatus;
  evaluator2ReviewStatus?: EvaluatorReviewStatus;
  evaluator1EvaluationData?: EvaluatorEvaluationSubmission | null;
  evaluator2EvaluationData?: EvaluatorEvaluationSubmission | null;
  /** Assigned interviewer public id (e.g. USR-001), if any */
  interviewerId?: string | null;
  interviewerName?: string | null;
  interviewerEmail?: string | null;
  interviewScore?: number | null;
  interviewEvaluationData?: InterviewEvaluationSubmission | null;
  /** Populated for evaluator sessions: this user's review on the application */
  myEvaluatorReviewStatus?: EvaluatorReviewStatus | null;
  /** Populated for evaluator sessions: this user's submitted evaluation scores */
  myEvaluatorEvaluationData?: EvaluatorEvaluationSubmission | null;
};

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "draft",
  "pending",
  "under_review",
  "evaluation",
  "interview",
  "final_evaluation",
  "offered",
  "reserved",
  "approved",
  "rejected",
  "pre_departure",
];

/** Statuses coordinators may set after submission (excludes in-progress drafts). */
export const COORDINATOR_APPLICATION_STATUSES: ApplicationStatus[] = [
  "pending",
  "under_review",
  "evaluation",
  "interview",
  "final_evaluation",
  "offered",
  "reserved",
  "approved",
  "rejected",
  "pre_departure",
];

/** Statuses in coordinator applicants list filters (includes in-progress drafts). */
export const COORDINATOR_APPLICANT_FILTER_STATUSES: ApplicationStatus[] = [
  "draft",
  ...COORDINATOR_APPLICATION_STATUSES,
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  under_review: "Eligibility Checks",
  evaluation: "Evaluation",
  interview: "Interview",
  final_evaluation: "Final Evaluation",
  offered: "Offered",
  reserved: "Reserved",
  approved: "Approved",
  rejected: "Rejected",
  pre_departure: "Pre-departure",
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

export function applicantDisplayName(app: ApplicationPayload): string {
  return [app.surname, app.firstName, app.middleName].filter(Boolean).join(" ");
}

export function applicantPrimaryEmail(app: ApplicationPayload): string {
  return app.personalEmail || app.email;
}
