"use client";

import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import type {
  ScholarsManagementSection,
  ScholarsNestedViewId,
} from "@/lib/coordinator-scholars-nav";
import { AcademicInterventionCorrectiveForm } from "./academic-intervention-corrective-form";
import { AdditionalFundingDisclosureForm } from "./additional-funding-disclosure-form";
import { ArrivalDepartureCertificationForm } from "./arrival-departure-certification-form";
import { BankAccountDetailsForm } from "./bank-account-details-form";
import { BankContactChangeRequestForm } from "./bank-contact-change-request-form";
import { ChangeOfMobilityDatesDurationForm } from "./change-of-mobility-dates-duration-form";
import { ComplaintGrievanceManagementForm } from "./complaint-grievance-management-form";
import { ConfirmationOfArrivalForm } from "./confirmation-of-arrival-form";
import { ConfirmationOfDepartureForm } from "./confirmation-of-departure-form";
import { ConfirmationOfParticipationForm } from "./confirmation-of-participation-form";
import { ConsortiumHostApprovalRegistrationForm } from "./consortium-host-approval-registration-form";
import { ContinuousMobilityPerformanceFinalForm } from "./continuous-mobility-performance-final-form";
import { ContinuousMobilityPerformanceForm } from "./continuous-mobility-performance-form";
import { CreditRecognitionActsTransferForm } from "./credit-recognition-acts-transfer-form";
import { CreditRecognitionDisputeReviewForm } from "./credit-recognition-dispute-review-form";
import { DegreeCertificateAwardForm } from "./degree-certificate-award-form";
import { DualAcademicSupervisionForm } from "./dual-academic-supervision-form";
import { EarlyWithdrawalTerminationRequestForm } from "./early-withdrawal-termination-request-form";
import { EndOfMobilityEvaluationExitSurveyForm } from "./end-of-mobility-evaluation-exit-survey-form";
import { FacilitiesAssessmentDueDiligenceForm } from "./facilities-assessment-due-diligence-form";
import { FinalMobilityAcademicReportForm } from "./final-mobility-academic-report-form";
import { HomeAcademicMentorReviewForm } from "./home-academic-mentor-review-form";
import { HostInstitutionFinalClearanceForm } from "./host-institution-final-clearance-form";
import { HostOrganisationInternshipEvaluationForm } from "./host-organisation-internship-evaluation-form";
import { IncidentWelfareSafetyReportForm } from "./incident-welfare-safety-report-form";
import { InsuranceRegistrationForm } from "./insurance-registration-form";
import { InternshipCertificationForm } from "./internship-certification-form";
import { InternshipCompletionReportForm } from "./internship-completion-report-form";
import { InternshipPlacementForm } from "./internship-placement-form";
import { InternshipWeeklyAttendanceForm } from "./internship-weekly-attendance-form";
import { LearningAgreementAmendmentCreditForm } from "./learning-agreement-amendment-credit-form";
import { LearningAgreementAmendmentDegreeForm } from "./learning-agreement-amendment-degree-form";
import { LearningAgreementCreditForm } from "./learning-agreement-credit-form";
import { LearningAgreementDegreeForm } from "./learning-agreement-degree-form";
import { MobilityAgreementStaffForm } from "./mobility-agreement-staff-form";
import { MobilityCompletionChecklistForm } from "./mobility-completion-checklist-form";
import { MobilityExtensionRequestForm } from "./mobility-extension-request-form";
import { MobilityInterruptionSuspensionRequestForm } from "./mobility-interruption-suspension-request-form";
import { OrganisationHostEligibilityScreeningForm } from "./organisation-host-eligibility-screening-form";
import { OrganisationHostTechnicalAssessmentForm } from "./organisation-host-technical-assessment-form";
import { OrganisationIdentificationNominationForm } from "./organisation-identification-nomination-form";
import { PaymentSuspensionCaseForm } from "./payment-suspension-case-form";
import { PreDepartureReadinessForm } from "./pre-departure-readiness-form";
import { ProgressReportFinalForm } from "./progress-report-final-form";
import { ProgressReportMidTermForm } from "./progress-report-mid-term-form";
import { PublicationResearchOutputRegistrationForm } from "./publication-research-output-registration-form";
import { ResearchCostRequestForm } from "./research-cost-request-form";
import { ResearchExpenditureReportForm } from "./research-expenditure-report-form";
import { ResearchThesisPlanForm } from "./research-thesis-plan-form";
import { ResumptionOfMobilityForm } from "./resumption-of-mobility-form";
import { ScholarAlumniTracerSurveyForm } from "./scholar-alumni-tracer-survey-form";
import { ScholarConfirmationOfPaymentForm } from "./scholar-confirmation-of-payment-form";
import { ScholarFeedbackSurveyFinalForm } from "./scholar-feedback-survey-final-form";
import { ScholarFeedbackSurveyForm } from "./scholar-feedback-survey-form";
import { ScholarshipInstallmentPaymentForm } from "./scholarship-installment-payment-form";
import { ScholarshipRepaymentRecoveryForm } from "./scholarship-repayment-recovery-form";
import { ScholarshipTerminationDecisionForm } from "./scholarship-termination-decision-form";
import { SignedInternshipAgreementPlanUploadForm } from "./signed-internship-agreement-plan-upload-form";
import { SignedMousForm } from "./signed-mous-form";
import { SpecialNeedsDisbursementForm } from "./special-needs-disbursement-form";
import { SupervisorEvaluationFinalForm } from "./supervisor-evaluation-final-form";
import { SupervisorEvaluationMidTermForm } from "./supervisor-evaluation-mid-term-form";
import { TeachingTraineeshipCertificateForm } from "./teaching-traineeship-certificate-form";
import { ThesisDissertationProgressForm } from "./thesis-dissertation-progress-form";
import { TranscriptOfRecordsSubmissionForm } from "./transcript-of-records-submission-form";
import { TravelEvidenceSubmissionForm } from "./travel-evidence-submission-form";
import { TravelLogisticsArrangementForm } from "./travel-logistics-arrangement-form";
import { VisaResidencePermitForm } from "./visa-residence-permit-form";

type FormProps = {
  user: ApplicantSessionUser;
  displayName: string;
};

function FormUnavailable({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm font-semibold text-amber-950">
      No interactive form is available yet for “{label}”.
    </div>
  );
}

export function CoordinatorScholarFormView({
  section,
  viewId,
  viewLabel,
  user,
  displayName,
}: {
  section: ScholarsManagementSection;
  viewId: ScholarsNestedViewId;
  viewLabel: string;
  user: ApplicantSessionUser;
  displayName: string;
}) {
  const props: FormProps = { user, displayName };

  if (section === "onboarding") {
    return <FormUnavailable label={viewLabel} />;
  }

  if (section === "pre_departure") {
    switch (viewId) {
      case "readiness":
        return <PreDepartureReadinessForm {...props} />;
      case "visa":
        return <VisaResidencePermitForm {...props} />;
      case "travel":
        return <TravelLogisticsArrangementForm {...props} />;
      case "evidence":
        return <TravelEvidenceSubmissionForm {...props} />;
      case "insurance":
        return <InsuranceRegistrationForm {...props} />;
      case "arrival":
        return <ConfirmationOfArrivalForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "finance") {
    switch (viewId) {
      case "bank_account":
        return <BankAccountDetailsForm {...props} />;
      case "bank_contact_change":
        return <BankContactChangeRequestForm {...props} />;
      case "repayment":
        return <ScholarshipRepaymentRecoveryForm {...props} />;
      case "installment_record":
        return <ScholarshipInstallmentPaymentForm {...props} />;
      case "payment_confirmation":
        return <ScholarConfirmationOfPaymentForm {...props} />;
      case "payment_suspension":
        return <PaymentSuspensionCaseForm {...props} />;
      case "research_cost":
        return <ResearchCostRequestForm {...props} />;
      case "research_expenditure":
        return <ResearchExpenditureReportForm {...props} />;
      case "additional_funding":
        return <AdditionalFundingDisclosureForm {...props} />;
      case "special_needs":
        return <SpecialNeedsDisbursementForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "academic_plan") {
    switch (viewId) {
      case "dual_supervision":
        return <DualAcademicSupervisionForm {...props} />;
      case "learning_agreement_degree":
        return <LearningAgreementDegreeForm {...props} />;
      case "learning_agreement_credit":
        return <LearningAgreementCreditForm {...props} />;
      case "mobility_agreement_staff":
        return <MobilityAgreementStaffForm {...props} />;
      case "learning_agreement_amendment_degree":
        return <LearningAgreementAmendmentDegreeForm {...props} />;
      case "learning_agreement_amendment_credit":
        return <LearningAgreementAmendmentCreditForm {...props} />;
      case "research_thesis_plan":
        return <ResearchThesisPlanForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "supervision") {
    switch (viewId) {
      case "progress_report_mid_term":
        return <ProgressReportMidTermForm {...props} />;
      case "progress_report_final":
        return <ProgressReportFinalForm {...props} />;
      case "supervisor_evaluation_mid_term":
        return <SupervisorEvaluationMidTermForm {...props} />;
      case "supervisor_evaluation_final":
        return <SupervisorEvaluationFinalForm {...props} />;
      case "home_mentor_review":
        return <HomeAcademicMentorReviewForm {...props} />;
      case "academic_invention_corrective":
        return <AcademicInterventionCorrectiveForm {...props} />;
      case "continuous_mobility_performance":
        return <ContinuousMobilityPerformanceForm {...props} />;
      case "continuous_mobility_performance_final":
        return <ContinuousMobilityPerformanceFinalForm {...props} />;
      case "scholar_feedback_survey":
        return <ScholarFeedbackSurveyForm {...props} />;
      case "scholar_feedback_survey_final":
        return <ScholarFeedbackSurveyFinalForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "internships") {
    switch (viewId) {
      case "signed_agreement_plan_upload":
        return <SignedInternshipAgreementPlanUploadForm {...props} />;
      case "placement":
        return <InternshipPlacementForm {...props} />;
      case "weekly_attendance":
        return <InternshipWeeklyAttendanceForm {...props} />;
      case "host_evaluation":
        return <HostOrganisationInternshipEvaluationForm {...props} />;
      case "completion_report":
        return <InternshipCompletionReportForm {...props} />;
      case "certification":
        return <InternshipCertificationForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "research_alumni") {
    switch (viewId) {
      case "publication_research_output":
        return <PublicationResearchOutputRegistrationForm {...props} />;
      case "thesis_dissertation_progress":
        return <ThesisDissertationProgressForm {...props} />;
      case "alumni_tracer_survey":
        return <ScholarAlumniTracerSurveyForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "grievance") {
    switch (viewId) {
      case "complaint_grievance_system":
        return <ComplaintGrievanceManagementForm {...props} />;
      case "incident_welfare_safety_report":
        return <IncidentWelfareSafetyReportForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "mobility_changes") {
    switch (viewId) {
      case "change_dates_duration":
        return <ChangeOfMobilityDatesDurationForm {...props} />;
      case "temporary_interruption_suspension":
        return <MobilityInterruptionSuspensionRequestForm {...props} />;
      case "resumption_of_mobility":
        return <ResumptionOfMobilityForm {...props} />;
      case "mobility_extension":
        return <MobilityExtensionRequestForm {...props} />;
      case "early_withdrawal_termination":
        return <EarlyWithdrawalTerminationRequestForm {...props} />;
      case "scholarship_termination_decision":
        return <ScholarshipTerminationDecisionForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "completion") {
    switch (viewId) {
      case "confirmation_of_participation":
        return <ConfirmationOfParticipationForm {...props} />;
      case "confirmation_of_departure":
        return <ConfirmationOfDepartureForm {...props} />;
      case "arrival_departure_certification":
        return <ArrivalDepartureCertificationForm {...props} />;
      case "transcript_of_records_submission":
        return <TranscriptOfRecordsSubmissionForm {...props} />;
      case "teaching_traineeship_certificate_upload":
        return <TeachingTraineeshipCertificateForm {...props} />;
      case "degree_certificate_award_upload":
        return <DegreeCertificateAwardForm {...props} />;
      case "credit_recognition_acts_transfer":
        return <CreditRecognitionActsTransferForm {...props} />;
      case "credit_recognition_dispute_review":
        return <CreditRecognitionDisputeReviewForm {...props} />;
      case "final_mobility_report_supervisor_approval":
        return <FinalMobilityAcademicReportForm {...props} />;
      case "host_institution_final_clearance":
        return <HostInstitutionFinalClearanceForm {...props} />;
      case "end_of_mobility_evaluation_exit_survey":
        return <EndOfMobilityEvaluationExitSurveyForm {...props} />;
      case "mobility_completion_checklist":
        return <MobilityCompletionChecklistForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  if (section === "collaborations") {
    switch (viewId) {
      case "organization_identification":
        return <OrganisationIdentificationNominationForm {...props} />;
      case "organization_host_eligibility_screening":
        return <OrganisationHostEligibilityScreeningForm {...props} />;
      case "organization_host_technical_assessment":
        return <OrganisationHostTechnicalAssessmentForm {...props} />;
      case "facilities_assessment_due_diligence":
        return <FacilitiesAssessmentDueDiligenceForm {...props} />;
      case "consortium_host_approval_registration":
        return <ConsortiumHostApprovalRegistrationForm {...props} />;
      case "signed_mous":
        return <SignedMousForm {...props} />;
      default:
        return <FormUnavailable label={viewLabel} />;
    }
  }

  return <FormUnavailable label={viewLabel} />;
}
