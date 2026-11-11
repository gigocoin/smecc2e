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
  | "collaborations";

export type ScholarNavAudience = "traineeship" | "internship";

export type ScholarNavItem = {
  id: ScholarSectionId;
  label: string;
  /** Limits the item to one mobility group. Quality Assurance is omitted for scholars. */
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
