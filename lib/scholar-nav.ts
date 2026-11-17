export type ScholarSectionId =
  | "onboarding"
  | "pre_departure"
  | "finance"
  | "academic_plan"
  | "supervision"
  | "traineeships"
  | "internships"
  | "research_alumni"
  | "grievance"
  | "mobility_changes"
  | "completion"
  | "quality_assurance"
  | "collaborations";

export type ScholarNavAudience = "traineeship" | "internship";

export type ScholarNavItem = {
  id: ScholarSectionId;
  label: string;
  /** Limits the item to one mobility group. */
  audience?: ScholarNavAudience;
};

export const SCHOLAR_NAV: readonly ScholarNavItem[] = [
  { id: "onboarding", label: "Onboarding" },
  { id: "pre_departure", label: "Pre-Departure & Arrival" },
  { id: "finance", label: "Scholars Finance" },
  { id: "academic_plan", label: "Academic / Mobility Plan" },
  { id: "supervision", label: "Supervision & Progress" },
  { id: "traineeships", label: "Traineeships Only", audience: "traineeship" },
  { id: "internships", label: "Internships Only", audience: "internship" },
  { id: "research_alumni", label: "Research Outputs & Alumni" },
  { id: "grievance", label: "Grievance & Welfare" },
  { id: "mobility_changes", label: "Mobility changes" },
  { id: "completion", label: "Completion & Recognition" },
  { id: "quality_assurance", label: "Quality Assurance (Not for Scholars)" },
  { id: "collaborations", label: "Collaborations" },
];

export function isTraineeshipMobility(mobilityType: string | null | undefined): boolean {
  return /traineeship/i.test(mobilityType ?? "");
}

export function isStaffMobility(mobilityType: string | null | undefined): boolean {
  return /staff\s*mobility/i.test(mobilityType ?? "");
}

export function scholarNavForMobility(
  mobilityType: string | null | undefined
): ScholarNavItem[] {
  const traineeship = isTraineeshipMobility(mobilityType);
  const staff = isStaffMobility(mobilityType);
  return SCHOLAR_NAV.filter((item) => {
    if (item.audience === "traineeship") return traineeship;
    if (item.audience === "internship") return !traineeship && !staff;
    return true;
  });
}

export function parseScholarSection(
  value: string | null | undefined,
  items: readonly ScholarNavItem[]
): ScholarSectionId {
  const match = items.find((item) => item.id === value);
  return match?.id ?? "onboarding";
}

export function scholarSectionHref(id: ScholarSectionId): string {
  if (id === "onboarding") return "/scholar";
  return `/scholar?section=${id}`;
}

export type ScholarOnboardingView =
  | "acceptance"
  | "agreement"
  | "contact"
  | "mobility"
  | "consent";

export type ScholarOnboardingNavItem = {
  id: ScholarOnboardingView;
  label: string;
};

export const SCHOLAR_ONBOARDING_NAV: readonly ScholarOnboardingNavItem[] = [
  {
    id: "acceptance",
    label: "Scholarship acceptance & fund declaration",
  },
  {
    id: "agreement",
    label: "Scholarship Agreement / E-Signature",
  },
  {
    id: "contact",
    label: "Personal & Contact Information Update",
  },
  {
    id: "mobility",
    label: "Mobility Details Confirmation",
  },
  {
    id: "consent",
    label: "Photo & Publication Consent",
  },
];

export function parseScholarOnboardingView(
  value: string | null | undefined
): ScholarOnboardingView | null {
  const match = SCHOLAR_ONBOARDING_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarOnboardingHref(id: ScholarOnboardingView): string {
  return `/scholar?section=onboarding&onboarding=${id}`;
}

export type ScholarArrivalView =
  | "readiness"
  | "visa"
  | "travel"
  | "evidence"
  | "insurance"
  | "arrival";

export type ScholarArrivalNavItem = {
  id: ScholarArrivalView;
  label: string;
};

export const SCHOLAR_ARRIVAL_NAV: readonly ScholarArrivalNavItem[] = [
  {
    id: "readiness",
    label: "Pre-Departure Readiness & Orientation",
  },
  {
    id: "visa",
    label: "Visa / Residence Permit Status",
  },
  {
    id: "travel",
    label: "Travel & Logistics Arrangement",
  },
  {
    id: "evidence",
    label: "Travel Evidence Submission",
  },
  {
    id: "insurance",
    label: "Insurance Registration & Compliance Verification",
  },
  {
    id: "arrival",
    label: "Confirmation of Arrival / Host Registration",
  },
];

export function parseScholarArrivalView(
  value: string | null | undefined
): ScholarArrivalView | null {
  const match = SCHOLAR_ARRIVAL_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarArrivalHref(id: ScholarArrivalView): string {
  return `/scholar?section=pre_departure&arrival=${id}`;
}

export type ScholarFinanceView =
  | "bank_account"
  | "bank_contact_change"
  | "repayment"
  | "installment_record"
  | "payment_confirmation"
  | "payment_suspension"
  | "research_cost"
  | "research_expenditure"
  | "additional_funding"
  | "special_needs";

export type ScholarFinanceNavItem = {
  id: ScholarFinanceView;
  label: string;
};

export const SCHOLAR_FINANCE_NAV: readonly ScholarFinanceNavItem[] = [
  { id: "bank_account", label: "Bank Account Details" },
  {
    id: "bank_contact_change",
    label: "Bank/Contact Details Change Request",
  },
  {
    id: "repayment",
    label: "Scholarship Repayment/Recovery",
  },
  {
    id: "installment_record",
    label: "Scholarship Installment Payment Record",
  },
  {
    id: "payment_confirmation",
    label: "Scholar Confirmation of Payment",
  },
  {
    id: "payment_suspension",
    label: "Payment Suspension/Adjustment/Delay Case",
  },
  { id: "research_cost", label: "Research Cost Request" },
  {
    id: "research_expenditure",
    label: "Research Expenditure/Utilisation Report",
  },
  {
    id: "additional_funding",
    label: "Additional Funding Disclosure",
  },
  {
    id: "special_needs",
    label: "Special needs Disbursement",
  },
];

export function parseScholarFinanceView(
  value: string | null | undefined
): ScholarFinanceView | null {
  const match = SCHOLAR_FINANCE_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarFinanceHref(id: ScholarFinanceView): string {
  return `/scholar?section=finance&finance=${id}`;
}

export type ScholarAcademicPlanView =
  | "dual_supervision"
  | "learning_agreement_degree"
  | "learning_agreement_credit"
  | "mobility_agreement_staff"
  | "learning_agreement_amendment_degree"
  | "learning_agreement_amendment_credit"
  | "research_thesis_plan";

export type ScholarAcademicPlanNavItem = {
  id: ScholarAcademicPlanView;
  label: string;
};

export const SCHOLAR_ACADEMIC_PLAN_NAV: readonly ScholarAcademicPlanNavItem[] = [
  {
    id: "dual_supervision",
    label: "Dual Academic Supervision Assignment Form",
  },
  {
    id: "learning_agreement_degree",
    label: "Learning Agreement (Degree Seeking Only)",
  },
  {
    id: "learning_agreement_credit",
    label: "Learning Agreement (Credit Seeking Only)",
  },
  {
    id: "mobility_agreement_staff",
    label: "Mobility Agreement (Staff Mobility Only)",
  },
  {
    id: "learning_agreement_amendment_degree",
    label: "Learning Agreement Amendment (Degree Seeking)",
  },
  {
    id: "learning_agreement_amendment_credit",
    label: "Learning Agreement Amendment (Credit Seeking)",
  },
  {
    id: "research_thesis_plan",
    label: "Research/Thesis Plan",
  },
];

export function parseScholarAcademicPlanView(
  value: string | null | undefined
): ScholarAcademicPlanView | null {
  const match = SCHOLAR_ACADEMIC_PLAN_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarAcademicPlanHref(id: ScholarAcademicPlanView): string {
  return `/scholar?section=academic_plan&plan=${id}`;
}

export type ScholarSupervisionView =
  | "progress_report_mid_term"
  | "progress_report_final"
  | "supervisor_evaluation_mid_term"
  | "supervisor_evaluation_final"
  | "home_mentor_review"
  | "academic_invention_corrective"
  | "continuous_mobility_performance"
  | "continuous_mobility_performance_final"
  | "scholar_feedback_survey"
  | "scholar_feedback_survey_final";

export type ScholarSupervisionNavItem = {
  id: ScholarSupervisionView;
  label: string;
};

export const SCHOLAR_SUPERVISION_NAV: readonly ScholarSupervisionNavItem[] = [
  {
    id: "progress_report_mid_term",
    label: "Student/Staff Progress Report (Mid-Term)",
  },
  {
    id: "progress_report_final",
    label: "Student/Staff Progress Report (Final)",
  },
  {
    id: "supervisor_evaluation_mid_term",
    label: "Supervisor/Host Evaluation Report (Mid-Term)",
  },
  {
    id: "supervisor_evaluation_final",
    label: "Supervisor/Host Evaluation Report (Final)",
  },
  {
    id: "home_mentor_review",
    label: "Home Academic Mentor Review",
  },
  {
    id: "academic_invention_corrective",
    label: "Academic Intervention/Corrective Action Plan",
  },
  {
    id: "continuous_mobility_performance",
    label: "Continous Mobility Performance Tracking (Mid-Term)",
  },
  {
    id: "continuous_mobility_performance_final",
    label: "Continous Mobility Performance Tracking (Final)",
  },
  {
    id: "scholar_feedback_survey",
    label: "Scholar Periodic Feedback/Satisfaction Survey (Mid-Term)",
  },
  {
    id: "scholar_feedback_survey_final",
    label: "Scholar Periodic Feedback/Satisfaction Survey (Final)",
  },
];

export function parseScholarSupervisionView(
  value: string | null | undefined
): ScholarSupervisionView | null {
  const match = SCHOLAR_SUPERVISION_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarSupervisionHref(id: ScholarSupervisionView): string {
  return `/scholar?section=supervision&progress=${id}`;
}

export type ScholarInternshipView =
  | "signed_agreement_plan_upload"
  | "placement"
  | "weekly_attendance"
  | "host_evaluation"
  | "completion_report"
  | "certification";

export type ScholarInternshipNavItem = {
  id: ScholarInternshipView;
  label: string;
};

export const SCHOLAR_INTERNSHIP_NAV: readonly ScholarInternshipNavItem[] = [
  {
    id: "signed_agreement_plan_upload",
    label: "Signed Internship Agreement & Plan Upload Form",
  },
  {
    id: "placement",
    label: "Internship Placement Form",
  },
  {
    id: "weekly_attendance",
    label: "Monitoring (Weekly Attendance)",
  },
  {
    id: "host_evaluation",
    label: "Host Organization Internship Evaluation Form",
  },
  {
    id: "completion_report",
    label: "Internship Completion Report Form",
  },
  {
    id: "certification",
    label: "Internship Certification Form",
  },
];

export function parseScholarInternshipView(
  value: string | null | undefined
): ScholarInternshipView | null {
  const match = SCHOLAR_INTERNSHIP_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarInternshipHref(id: ScholarInternshipView): string {
  return `/scholar?section=internships&internship=${id}`;
}

export type ScholarResearchAlumniView =
  | "publication_research_output"
  | "thesis_dissertation_progress"
  | "alumni_tracer_survey";

export type ScholarResearchAlumniNavItem = {
  id: ScholarResearchAlumniView;
  label: string;
};

export const SCHOLAR_RESEARCH_ALUMNI_NAV: readonly ScholarResearchAlumniNavItem[] =
  [
    {
      id: "publication_research_output",
      label: "Publication/Research Output Registration",
    },
    {
      id: "thesis_dissertation_progress",
      label: "Thesis/Dissertation Progress",
    },
    {
      id: "alumni_tracer_survey",
      label: "Scholar Alumni/Tracer Survey",
    },
  ];

export function parseScholarResearchAlumniView(
  value: string | null | undefined
): ScholarResearchAlumniView | null {
  const match = SCHOLAR_RESEARCH_ALUMNI_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarResearchAlumniHref(
  id: ScholarResearchAlumniView
): string {
  return `/scholar?section=research_alumni&research=${id}`;
}

export type ScholarGrievanceView =
  | "complaint_grievance_system"
  | "incident_welfare_safety_report";

export type ScholarGrievanceNavItem = {
  id: ScholarGrievanceView;
  label: string;
};

export const SCHOLAR_GRIEVANCE_NAV: readonly ScholarGrievanceNavItem[] = [
  {
    id: "complaint_grievance_system",
    label: "Complaint/Grievance System",
  },
  {
    id: "incident_welfare_safety_report",
    label: "Incident/Welfare/Safety Report",
  },
];

export function parseScholarGrievanceView(
  value: string | null | undefined
): ScholarGrievanceView | null {
  const match = SCHOLAR_GRIEVANCE_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarGrievanceHref(id: ScholarGrievanceView): string {
  return `/scholar?section=grievance&grievance=${id}`;
}

export type ScholarMobilityChangeView =
  | "change_dates_duration"
  | "temporary_interruption_suspension"
  | "resumption_of_mobility"
  | "mobility_extension"
  | "early_withdrawal_termination"
  | "scholarship_termination_decision";

export type ScholarMobilityChangeNavItem = {
  id: ScholarMobilityChangeView;
  label: string;
};

export const SCHOLAR_MOBILITY_CHANGE_NAV: readonly ScholarMobilityChangeNavItem[] =
  [
    {
      id: "change_dates_duration",
      label: "Change of Mobility Dates/Duration Request & Approval",
    },
    {
      id: "temporary_interruption_suspension",
      label: "Temporary Interruption/Suspension Request",
    },
    {
      id: "resumption_of_mobility",
      label: "Resumption of Mobility",
    },
    {
      id: "mobility_extension",
      label: "Mobility Extension Request & Approval",
    },
    {
      id: "early_withdrawal_termination",
      label: "Early Withdrawal/Termination Request",
    },
    {
      id: "scholarship_termination_decision",
      label: "Scholarship Termination Decision",
    },
  ];

export function parseScholarMobilityChangeView(
  value: string | null | undefined
): ScholarMobilityChangeView | null {
  const match = SCHOLAR_MOBILITY_CHANGE_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarMobilityChangeHref(
  id: ScholarMobilityChangeView
): string {
  return `/scholar?section=mobility_changes&change=${id}`;
}

export type ScholarCompletionView =
  | "confirmation_of_participation"
  | "confirmation_of_departure"
  | "arrival_departure_certification"
  | "transcript_of_records_submission"
  | "internship_certificate_upload"
  | "teaching_traineeship_certificate_upload"
  | "degree_certificate_award_upload"
  | "credit_recognition_acts_transfer"
  | "credit_recognition_dispute_review"
  | "final_mobility_report_supervisor_approval"
  | "host_institution_final_clearance"
  | "end_of_mobility_evaluation_exit_survey"
  | "mobility_completion_checklist";

export type ScholarCompletionNavItem = {
  id: ScholarCompletionView;
  label: string;
};

export const SCHOLAR_COMPLETION_NAV: readonly ScholarCompletionNavItem[] = [
  {
    id: "confirmation_of_participation",
    label: "Confirmation of Participation",
  },
  {
    id: "confirmation_of_departure",
    label: "Confirmation of Departure",
  },
  {
    id: "arrival_departure_certification",
    label: "Arrival & Departure Certification",
  },
  {
    id: "transcript_of_records_submission",
    label: "Transcript of Records Submission",
  },
  {
    id: "internship_certificate_upload",
    label: "Internship Certificate Upload",
  },
  {
    id: "teaching_traineeship_certificate_upload",
    label: "Teaching/Traineeship Certificate Upload",
  },
  {
    id: "degree_certificate_award_upload",
    label: "Degree/Certificate Award Upload",
  },
  {
    id: "credit_recognition_acts_transfer",
    label: "Credit Recognition/ACTS Transfer",
  },
  {
    id: "credit_recognition_dispute_review",
    label: "Credit Recognition Dispute/Review",
  },
  {
    id: "final_mobility_report_supervisor_approval",
    label: "Final Mobility Report & Supervisor Approval",
  },
  {
    id: "host_institution_final_clearance",
    label: "Host Institution Final Clearance",
  },
  {
    id: "end_of_mobility_evaluation_exit_survey",
    label: "End-of-Mobility Evaluation/Exit Survey",
  },
  {
    id: "mobility_completion_checklist",
    label: "Mobility Completion Checklist",
  },
];

export function parseScholarCompletionView(
  value: string | null | undefined
): ScholarCompletionView | null {
  const match = SCHOLAR_COMPLETION_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarCompletionHref(id: ScholarCompletionView): string {
  return `/scholar?section=completion&completion=${id}`;
}

export type ScholarCollaborationView =
  | "organization_identification"
  | "organization_host_eligibility_screening"
  | "organization_host_technical_assessment"
  | "facilities_assessment_due_diligence"
  | "consortium_host_approval_registration"
  | "signed_mous"
  | "industrial_projects";

export type ScholarCollaborationNavItem = {
  id: ScholarCollaborationView;
  label: string;
};

export const SCHOLAR_COLLABORATION_NAV: readonly ScholarCollaborationNavItem[] =
  [
    {
      id: "organization_identification",
      label: "Organization Identification",
    },
    {
      id: "organization_host_eligibility_screening",
      label: "Organization Host Eligibility Screening",
    },
    {
      id: "organization_host_technical_assessment",
      label: "Organization Host Technical Assessment",
    },
    {
      id: "facilities_assessment_due_diligence",
      label: "Facilities Assessment & Due Diligence Verification",
    },
    {
      id: "consortium_host_approval_registration",
      label: "Consortium Host Approval & Host Registration",
    },
    {
      id: "signed_mous",
      label: "Signed MOUs",
    },
    {
      id: "industrial_projects",
      label: "Industrial Projects",
    },
  ];

export function parseScholarCollaborationView(
  value: string | null | undefined
): ScholarCollaborationView | null {
  const match = SCHOLAR_COLLABORATION_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarCollaborationHref(
  id: ScholarCollaborationView
): string {
  return `/scholar?section=collaborations&collab=${id}`;
}

export type ScholarQualityAssuranceView =
  | "partner_hei_quarterly_progress"
  | "internal_quality_assurance_review"
  | "external_peer_industry_evaluation"
  | "mid_term_project_evaluation"
  | "final_project_evaluation"
  | "quality_improvement_corrective_action_log";

export type ScholarQualityAssuranceNavItem = {
  id: ScholarQualityAssuranceView;
  label: string;
};

export const SCHOLAR_QUALITY_ASSURANCE_NAV: readonly ScholarQualityAssuranceNavItem[] =
  [
    {
      id: "partner_hei_quarterly_progress",
      label: "Partner HEI Quarterly Progress Report",
    },
    {
      id: "internal_quality_assurance_review",
      label: "Internal Quality Assurance Review",
    },
    {
      id: "external_peer_industry_evaluation",
      label: "External Peer/Industry Evaluation",
    },
    {
      id: "mid_term_project_evaluation",
      label: "Mid-Term Project Evaluation",
    },
    {
      id: "final_project_evaluation",
      label: "Final Project Evaluation",
    },
    {
      id: "quality_improvement_corrective_action_log",
      label: "Quality Improvement/Corrective Action Log",
    },
  ];

export function parseScholarQualityAssuranceView(
  value: string | null | undefined
): ScholarQualityAssuranceView | null {
  const match = SCHOLAR_QUALITY_ASSURANCE_NAV.find((item) => item.id === value);
  return match?.id ?? null;
}

export function scholarQualityAssuranceHref(
  id: ScholarQualityAssuranceView
): string {
  return `/scholar?section=quality_assurance&qa=${id}`;
}
