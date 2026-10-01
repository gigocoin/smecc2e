export type ScholarsManagementSection =
  | "mobilities"
  | "tasks"
  | "approvals"
  | "grievances"
  | "payments"
  | "reminders"
  | "surveys"
  | "records";

export type ScholarsMobilityView =
  | "incoming"
  | "active"
  | "inactive"
  | "alumni";

export type ScholarsManagementNavId = ScholarsManagementSection;

export type ScholarsTaskView =
  | "amend_cancel"
  | "other_agreements"
  | "assign_scholars"
  | "assign_administrators";

export type ScholarsManagementNavItem = {
  id: ScholarsManagementNavId;
  label: string;
  href?: string;
  section: ScholarsManagementSection;
  /** Renders a nested right flyout instead of a direct link. */
  nestedMenu?:
    | "mobilities"
    | "tasks"
    | "approvals"
    | "grievances"
    | "payments"
    | "records";
};

export type ScholarsMobilityNavItem = {
  id: ScholarsMobilityView;
  label: string;
  href: string;
};

export type ScholarsTaskNavItem = {
  id: ScholarsTaskView;
  label: string;
  href: string;
};

export type ScholarsApprovalView =
  | "assign_administrators"
  | "administrator_approvals"
  | "announcements";

export type ScholarsApprovalNavItem = {
  id: ScholarsApprovalView;
  label: string;
  href: string;
};

export type ScholarsPaymentView =
  | "disbursements_to_partners"
  | "bank_details"
  | "allowance_schedule"
  | "payment_confirmations"
  | "insurance_costs"
  | "research_costs";

export type ScholarsPaymentNavItem = {
  id: ScholarsPaymentView;
  label: string;
  href: string;
};

export type ScholarsRecordView =
  | "signed_agreements"
  | "scholar_feedback"
  | "mobility_report"
  | "internship_report"
  | "financial_evidence_report"
  | "academic_supervision_report";

export type ScholarsRecordNavItem = {
  id: ScholarsRecordView;
  label: string;
  href: string;
};

export type ScholarsGrievanceView =
  | "level_one"
  | "level_two"
  | "decisions_remedies";

export type ScholarsGrievanceNavItem = {
  id: ScholarsGrievanceView;
  label: string;
  href: string;
};

export const SCHOLARS_MANAGEMENT_SECTION_LABELS: Record<
  ScholarsManagementSection,
  string
> = {
  mobilities: "Mobilities",
  tasks: "Tasks",
  approvals: "Approvals",
  grievances: "Grievances",
  payments: "Payments",
  reminders: "Reminders",
  surveys: "Surveys",
  records: "Records",
};

export const SCHOLARS_MOBILITY_VIEW_LABELS: Record<ScholarsMobilityView, string> =
  {
    incoming: "Incoming Scholars",
    active: "Active Scholars",
    inactive: "Inactive/At Risk Scholars",
    alumni: "Completed/Alumni",
  };

export const SCHOLARS_TASK_VIEW_LABELS: Record<ScholarsTaskView, string> = {
  amend_cancel: "Amend/Cancel existing Scholarship agreements",
  other_agreements: "View/download other Agreements",
  assign_scholars: "Assign to Scholars",
  assign_administrators: "Assign to Administrators",
};

export const SCHOLARS_APPROVAL_VIEW_LABELS: Record<
  ScholarsApprovalView,
  string
> = {
  assign_administrators: "Assign to Administrators",
  administrator_approvals: "Administrators: Approvals",
  announcements: "Announcements",
};

export const SCHOLARS_GRIEVANCE_VIEW_LABELS: Record<
  ScholarsGrievanceView,
  string
> = {
  level_one: "Level one complaints",
  level_two: "Level two complaints",
  decisions_remedies: "Decisions and Remedies",
};

export const SCHOLARS_PAYMENT_VIEW_LABELS: Record<ScholarsPaymentView, string> =
  {
    disbursements_to_partners: "Disbursements to partners",
    bank_details: "Scholars Bank-detail record",
    allowance_schedule: "Allowance payment Schedule",
    payment_confirmations: "Payment Confirmations",
    insurance_costs: "Insurance Costs",
    research_costs: "Research-costs",
  };

export const SCHOLARS_RECORD_VIEW_LABELS: Record<ScholarsRecordView, string> = {
  signed_agreements: "signed Scholarship Agreements",
  scholar_feedback: "Scholar feedback",
  mobility_report: "Mobility Report",
  internship_report: "Internship report",
  financial_evidence_report: "Financial evidence report",
  academic_supervision_report: "Academic & Supervision report",
};

const DEFAULT_SCHOLARS_SECTION: ScholarsManagementSection = "mobilities";
const DEFAULT_MOBILITY_VIEW: ScholarsMobilityView = "incoming";
const DEFAULT_TASK_VIEW: ScholarsTaskView = "amend_cancel";
const DEFAULT_APPROVAL_VIEW: ScholarsApprovalView = "assign_administrators";
const DEFAULT_GRIEVANCE_VIEW: ScholarsGrievanceView = "level_one";
const DEFAULT_PAYMENT_VIEW: ScholarsPaymentView = "disbursements_to_partners";
const DEFAULT_RECORD_VIEW: ScholarsRecordView = "signed_agreements";

export function buildScholarsManagementNav(
  basePath: string
): ScholarsManagementNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (
    Object.keys(SCHOLARS_MANAGEMENT_SECTION_LABELS) as ScholarsManagementSection[]
  ).map((section) => {
    if (
      section === "mobilities" ||
      section === "tasks" ||
      section === "approvals" ||
      section === "grievances" ||
      section === "payments" ||
      section === "records"
    ) {
      return {
        id: section,
        label: SCHOLARS_MANAGEMENT_SECTION_LABELS[section],
        section,
        nestedMenu: section,
      };
    }
    return {
      id: section,
      label: SCHOLARS_MANAGEMENT_SECTION_LABELS[section],
      section,
      href: `${scholarsBase}?section=${section}`,
    };
  });
}

export function buildScholarsMobilityNav(
  basePath: string
): ScholarsMobilityNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (
    Object.keys(SCHOLARS_MOBILITY_VIEW_LABELS) as ScholarsMobilityView[]
  ).map((view) => ({
    id: view,
    label: SCHOLARS_MOBILITY_VIEW_LABELS[view],
    href:
      view === DEFAULT_MOBILITY_VIEW
        ? scholarsBase
        : `${scholarsBase}?mobility=${view}`,
  }));
}

export function parseScholarsManagementSection(
  sectionParam: string | null
): ScholarsManagementSection {
  if (
    sectionParam &&
    sectionParam in SCHOLARS_MANAGEMENT_SECTION_LABELS &&
    sectionParam !== DEFAULT_SCHOLARS_SECTION
  ) {
    return sectionParam as ScholarsManagementSection;
  }
  return DEFAULT_SCHOLARS_SECTION;
}

export function buildScholarsTaskNav(basePath: string): ScholarsTaskNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (Object.keys(SCHOLARS_TASK_VIEW_LABELS) as ScholarsTaskView[]).map(
    (view) => ({
      id: view,
      label: SCHOLARS_TASK_VIEW_LABELS[view],
      href:
        view === DEFAULT_TASK_VIEW
          ? `${scholarsBase}?section=tasks`
          : `${scholarsBase}?section=tasks&task=${view}`,
    })
  );
}

export function parseScholarsMobilityView(
  mobilityParam: string | null
): ScholarsMobilityView {
  if (mobilityParam && mobilityParam in SCHOLARS_MOBILITY_VIEW_LABELS) {
    return mobilityParam as ScholarsMobilityView;
  }
  return DEFAULT_MOBILITY_VIEW;
}

export function parseScholarsTaskView(
  taskParam: string | null
): ScholarsTaskView {
  if (taskParam && taskParam in SCHOLARS_TASK_VIEW_LABELS) {
    return taskParam as ScholarsTaskView;
  }
  return DEFAULT_TASK_VIEW;
}

export function buildScholarsApprovalNav(
  basePath: string
): ScholarsApprovalNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (
    Object.keys(SCHOLARS_APPROVAL_VIEW_LABELS) as ScholarsApprovalView[]
  ).map((view) => ({
    id: view,
    label: SCHOLARS_APPROVAL_VIEW_LABELS[view],
    href:
      view === DEFAULT_APPROVAL_VIEW
        ? `${scholarsBase}?section=approvals`
        : `${scholarsBase}?section=approvals&approval=${view}`,
  }));
}

export function parseScholarsApprovalView(
  approvalParam: string | null
): ScholarsApprovalView {
  if (approvalParam && approvalParam in SCHOLARS_APPROVAL_VIEW_LABELS) {
    return approvalParam as ScholarsApprovalView;
  }
  return DEFAULT_APPROVAL_VIEW;
}

export function buildScholarsGrievanceNav(
  basePath: string
): ScholarsGrievanceNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (
    Object.keys(SCHOLARS_GRIEVANCE_VIEW_LABELS) as ScholarsGrievanceView[]
  ).map((view) => ({
    id: view,
    label: SCHOLARS_GRIEVANCE_VIEW_LABELS[view],
    href:
      view === DEFAULT_GRIEVANCE_VIEW
        ? `${scholarsBase}?section=grievances`
        : `${scholarsBase}?section=grievances&grievance=${view}`,
  }));
}

export function parseScholarsGrievanceView(
  grievanceParam: string | null
): ScholarsGrievanceView {
  if (grievanceParam && grievanceParam in SCHOLARS_GRIEVANCE_VIEW_LABELS) {
    return grievanceParam as ScholarsGrievanceView;
  }
  return DEFAULT_GRIEVANCE_VIEW;
}

export function buildScholarsPaymentNav(
  basePath: string
): ScholarsPaymentNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (
    Object.keys(SCHOLARS_PAYMENT_VIEW_LABELS) as ScholarsPaymentView[]
  ).map((view) => ({
    id: view,
    label: SCHOLARS_PAYMENT_VIEW_LABELS[view],
    href:
      view === DEFAULT_PAYMENT_VIEW
        ? `${scholarsBase}?section=payments`
        : `${scholarsBase}?section=payments&payment=${view}`,
  }));
}

export function parseScholarsPaymentView(
  paymentParam: string | null
): ScholarsPaymentView {
  if (paymentParam && paymentParam in SCHOLARS_PAYMENT_VIEW_LABELS) {
    return paymentParam as ScholarsPaymentView;
  }
  return DEFAULT_PAYMENT_VIEW;
}

export function isScholarsPaymentsGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return sectionParam === "payments";
}

export function isScholarsPaymentSubActive(
  item: ScholarsPaymentNavItem,
  pathname: string,
  sectionParam: string | null,
  paymentParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsPaymentsGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsPaymentView(paymentParam) === item.id;
}

export function buildScholarsRecordNav(
  basePath: string
): ScholarsRecordNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (Object.keys(SCHOLARS_RECORD_VIEW_LABELS) as ScholarsRecordView[]).map(
    (view) => ({
      id: view,
      label: SCHOLARS_RECORD_VIEW_LABELS[view],
      href:
        view === DEFAULT_RECORD_VIEW
          ? `${scholarsBase}?section=records`
          : `${scholarsBase}?section=records&record=${view}`,
    })
  );
}

export function parseScholarsRecordView(
  recordParam: string | null
): ScholarsRecordView {
  if (recordParam && recordParam in SCHOLARS_RECORD_VIEW_LABELS) {
    return recordParam as ScholarsRecordView;
  }
  return DEFAULT_RECORD_VIEW;
}

export function isScholarsRecordsGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return sectionParam === "records";
}

export function isScholarsRecordSubActive(
  item: ScholarsRecordNavItem,
  pathname: string,
  sectionParam: string | null,
  recordParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsRecordsGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsRecordView(recordParam) === item.id;
}

export function isScholarsGrievancesGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return sectionParam === "grievances";
}

export function isScholarsGrievanceSubActive(
  item: ScholarsGrievanceNavItem,
  pathname: string,
  sectionParam: string | null,
  grievanceParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsGrievancesGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsGrievanceView(grievanceParam) === item.id;
}

export function isScholarsApprovalsGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return sectionParam === "approvals";
}

export function isScholarsApprovalSubActive(
  item: ScholarsApprovalNavItem,
  pathname: string,
  sectionParam: string | null,
  approvalParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsApprovalsGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsApprovalView(approvalParam) === item.id;
}

export function isScholarsTasksGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return sectionParam === "tasks";
}

export function isScholarsTaskSubActive(
  item: ScholarsTaskNavItem,
  pathname: string,
  sectionParam: string | null,
  taskParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsTasksGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsTaskView(taskParam) === item.id;
}

export function isScholarsMobilityGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return !sectionParam || sectionParam === DEFAULT_SCHOLARS_SECTION;
}

export function isScholarsMobilitySubActive(
  item: ScholarsMobilityNavItem,
  pathname: string,
  sectionParam: string | null,
  mobilityParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsMobilityGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsMobilityView(mobilityParam) === item.id;
}

export function isScholarsManagementSubActive(
  item: ScholarsManagementNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  if (item.nestedMenu === "mobilities") {
    return isScholarsMobilityGroupActive(pathname, sectionParam, basePath);
  }
  if (item.nestedMenu === "tasks") {
    return isScholarsTasksGroupActive(pathname, sectionParam, basePath);
  }
  if (item.nestedMenu === "approvals") {
    return isScholarsApprovalsGroupActive(pathname, sectionParam, basePath);
  }
  if (item.nestedMenu === "grievances") {
    return isScholarsGrievancesGroupActive(pathname, sectionParam, basePath);
  }
  if (item.nestedMenu === "payments") {
    return isScholarsPaymentsGroupActive(pathname, sectionParam, basePath);
  }
  if (item.nestedMenu === "records") {
    return isScholarsRecordsGroupActive(pathname, sectionParam, basePath);
  }
  return sectionParam === item.section;
}

export function isScholarsManagementGroupActive(
  items: ScholarsManagementNavItem[],
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  return items.some((item) =>
    isScholarsManagementSubActive(item, pathname, sectionParam, basePath)
  );
}
