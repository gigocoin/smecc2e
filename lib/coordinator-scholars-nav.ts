import {
  SCHOLAR_ACADEMIC_PLAN_NAV,
  SCHOLAR_ARRIVAL_NAV,
  SCHOLAR_COLLABORATION_NAV,
  SCHOLAR_COMPLETION_NAV,
  SCHOLAR_FINANCE_NAV,
  SCHOLAR_GRIEVANCE_NAV,
  SCHOLAR_INTERNSHIP_NAV,
  SCHOLAR_MOBILITY_CHANGE_NAV,
  SCHOLAR_ONBOARDING_NAV,
  SCHOLAR_RESEARCH_ALUMNI_NAV,
  SCHOLAR_SUPERVISION_NAV,
  type ScholarAcademicPlanView,
  type ScholarArrivalView,
  type ScholarCollaborationView,
  type ScholarCompletionView,
  type ScholarFinanceView,
  type ScholarGrievanceView,
  type ScholarInternshipView,
  type ScholarMobilityChangeView,
  type ScholarOnboardingView,
  type ScholarResearchAlumniView,
  type ScholarSupervisionView,
} from "@/lib/scholar-nav";

export type ScholarsManagementSection =
  | "onboarding"
  | "pre_departure"
  | "finance"
  | "academic_plan"
  | "supervision"
  | "internships"
  | "research_alumni"
  | "grievance"
  | "mobility_changes"
  | "completion"
  | "collaborations";

export type ScholarsNestedMenuKey = Exclude<ScholarsManagementSection, never>;

export type ScholarsOnboardingView = ScholarOnboardingView;
export type ScholarsArrivalView = ScholarArrivalView;
export type ScholarsFinanceView = ScholarFinanceView;
export type ScholarsAcademicPlanView = ScholarAcademicPlanView;
export type ScholarsSupervisionView = ScholarSupervisionView;
export type ScholarsInternshipView = ScholarInternshipView;
export type ScholarsResearchAlumniView = ScholarResearchAlumniView;
export type ScholarsGrievanceView = ScholarGrievanceView;
export type ScholarsMobilityChangeView = ScholarMobilityChangeView;
export type ScholarsCompletionView = ScholarCompletionView;
export type ScholarsCollaborationView = ScholarCollaborationView;

export type ScholarsNestedViewId =
  | ScholarsOnboardingView
  | ScholarsArrivalView
  | ScholarsFinanceView
  | ScholarsAcademicPlanView
  | ScholarsSupervisionView
  | ScholarsInternshipView
  | ScholarsResearchAlumniView
  | ScholarsGrievanceView
  | ScholarsMobilityChangeView
  | ScholarsCompletionView
  | ScholarsCollaborationView;

export type ScholarsManagementNavId = ScholarsManagementSection;

export type ScholarsManagementNavItem = {
  id: ScholarsManagementNavId;
  label: string;
  href?: string;
  section: ScholarsManagementSection;
  nestedMenu: ScholarsNestedMenuKey;
};

export type ScholarsNestedNavItem = {
  id: ScholarsNestedViewId;
  label: string;
  href: string;
  section: ScholarsManagementSection;
  queryKey: string;
};

export const SCHOLARS_MANAGEMENT_SECTION_LABELS: Record<
  ScholarsManagementSection,
  string
> = {
  onboarding: "Onboarding",
  pre_departure: "Pre-departure & Arrival",
  finance: "Scholars Finance",
  academic_plan: "Academic/Mobility Plan",
  supervision: "Supervision & Progress",
  internships: "Internships Only",
  research_alumni: "Research Outputs & Alumni",
  grievance: "Grievance & Welfare",
  mobility_changes: "Mobility changes",
  completion: "Completion & Recognition",
  collaborations: "Collaborations",
};

export const SCHOLARS_SECTION_QUERY_KEY: Record<
  ScholarsManagementSection,
  string
> = {
  onboarding: "onboarding",
  pre_departure: "arrival",
  finance: "finance",
  academic_plan: "plan",
  supervision: "progress",
  internships: "internship",
  research_alumni: "research",
  grievance: "grievance",
  mobility_changes: "change",
  completion: "completion",
  collaborations: "collab",
};

const SECTION_NAV: Record<
  ScholarsManagementSection,
  readonly { id: string; label: string }[]
> = {
  onboarding: SCHOLAR_ONBOARDING_NAV,
  pre_departure: SCHOLAR_ARRIVAL_NAV,
  finance: SCHOLAR_FINANCE_NAV,
  academic_plan: SCHOLAR_ACADEMIC_PLAN_NAV,
  supervision: SCHOLAR_SUPERVISION_NAV,
  internships: SCHOLAR_INTERNSHIP_NAV,
  research_alumni: SCHOLAR_RESEARCH_ALUMNI_NAV,
  grievance: SCHOLAR_GRIEVANCE_NAV,
  mobility_changes: SCHOLAR_MOBILITY_CHANGE_NAV,
  completion: SCHOLAR_COMPLETION_NAV,
  collaborations: SCHOLAR_COLLABORATION_NAV,
};

export const SCHOLARS_ONBOARDING_VIEW_LABELS: Record<
  ScholarsOnboardingView,
  string
> = Object.fromEntries(
  SCHOLAR_ONBOARDING_NAV.map((item) => [item.id, item.label])
) as Record<ScholarsOnboardingView, string>;

const DEFAULT_SCHOLARS_SECTION: ScholarsManagementSection = "onboarding";
const DEFAULT_ONBOARDING_VIEW: ScholarsOnboardingView = "acceptance";

function defaultViewForSection(
  section: ScholarsManagementSection
): ScholarsNestedViewId {
  if (section === "onboarding") return DEFAULT_ONBOARDING_VIEW;
  return SECTION_NAV[section][0].id as ScholarsNestedViewId;
}

export function buildScholarsManagementNav(
  basePath: string
): ScholarsManagementNavItem[] {
  return (
    Object.keys(SCHOLARS_MANAGEMENT_SECTION_LABELS) as ScholarsManagementSection[]
  ).map((section) => ({
    id: section,
    label: SCHOLARS_MANAGEMENT_SECTION_LABELS[section],
    section,
    nestedMenu: section,
  }));
}

export function buildScholarsNestedNav(
  basePath: string,
  section: ScholarsManagementSection
): ScholarsNestedNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;
  const queryKey = SCHOLARS_SECTION_QUERY_KEY[section];
  const defaultView = defaultViewForSection(section);

  return SECTION_NAV[section].map((item) => {
    const isDefaultOnboarding =
      section === "onboarding" && item.id === defaultView;
    const href = isDefaultOnboarding
      ? scholarsBase
      : section === "onboarding"
        ? `${scholarsBase}?onboarding=${item.id}`
        : `${scholarsBase}?section=${section}&${queryKey}=${item.id}`;

    return {
      id: item.id as ScholarsNestedViewId,
      label: item.label,
      href,
      section,
      queryKey,
    };
  });
}

/** @deprecated Use buildScholarsNestedNav(basePath, "onboarding") */
export function buildScholarsOnboardingNav(
  basePath: string
): ScholarsNestedNavItem[] {
  return buildScholarsNestedNav(basePath, "onboarding");
}

export function parseScholarsManagementSection(
  sectionParam: string | null
): ScholarsManagementSection {
  if (
    sectionParam &&
    sectionParam in SCHOLARS_MANAGEMENT_SECTION_LABELS
  ) {
    return sectionParam as ScholarsManagementSection;
  }
  return DEFAULT_SCHOLARS_SECTION;
}

export function parseScholarsNestedView(
  section: ScholarsManagementSection,
  viewParam: string | null
): ScholarsNestedViewId {
  const nav = SECTION_NAV[section];
  const match = nav.find((item) => item.id === viewParam);
  if (match) return match.id as ScholarsNestedViewId;
  return defaultViewForSection(section);
}

export function parseScholarsOnboardingView(
  onboardingParam: string | null
): ScholarsOnboardingView {
  return parseScholarsNestedView(
    "onboarding",
    onboardingParam
  ) as ScholarsOnboardingView;
}

export function scholarsNestedViewLabel(
  section: ScholarsManagementSection,
  viewId: ScholarsNestedViewId
): string {
  const match = SECTION_NAV[section].find((item) => item.id === viewId);
  return match?.label ?? SCHOLARS_MANAGEMENT_SECTION_LABELS[section];
}

export function isScholarsNestedGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string,
  section: ScholarsManagementSection
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return parseScholarsManagementSection(sectionParam) === section;
}

export function isScholarsOnboardingGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  return isScholarsNestedGroupActive(
    pathname,
    sectionParam,
    basePath,
    "onboarding"
  );
}

export function isScholarsNestedSubActive(
  item: ScholarsNestedNavItem,
  pathname: string,
  sectionParam: string | null,
  viewParam: string | null,
  basePath: string
): boolean {
  if (
    !isScholarsNestedGroupActive(
      pathname,
      sectionParam,
      basePath,
      item.section
    )
  ) {
    return false;
  }
  return parseScholarsNestedView(item.section, viewParam) === item.id;
}

export function isScholarsOnboardingSubActive(
  item: ScholarsNestedNavItem,
  pathname: string,
  sectionParam: string | null,
  onboardingParam: string | null,
  basePath: string
): boolean {
  return isScholarsNestedSubActive(
    item,
    pathname,
    sectionParam,
    onboardingParam,
    basePath
  );
}

export function isScholarsManagementSubActive(
  item: ScholarsManagementNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  return isScholarsNestedGroupActive(
    pathname,
    sectionParam,
    basePath,
    item.section
  );
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

export function getScholarsNestedViewParam(
  section: ScholarsManagementSection,
  searchParams: { get: (key: string) => string | null }
): string | null {
  return searchParams.get(SCHOLARS_SECTION_QUERY_KEY[section]);
}
