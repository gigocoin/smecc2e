import {
  SCHOLAR_ONBOARDING_NAV,
  type ScholarOnboardingView,
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

export type ScholarsOnboardingView = ScholarOnboardingView;

export type ScholarsManagementNavId = ScholarsManagementSection;

export type ScholarsManagementNavItem = {
  id: ScholarsManagementNavId;
  label: string;
  href?: string;
  section: ScholarsManagementSection;
  nestedMenu?: "onboarding";
};

export type ScholarsOnboardingNavItem = {
  id: ScholarsOnboardingView;
  label: string;
  href: string;
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

export const SCHOLARS_ONBOARDING_VIEW_LABELS: Record<
  ScholarsOnboardingView,
  string
> = Object.fromEntries(
  SCHOLAR_ONBOARDING_NAV.map((item) => [item.id, item.label])
) as Record<ScholarsOnboardingView, string>;

const DEFAULT_SCHOLARS_SECTION: ScholarsManagementSection = "onboarding";
const DEFAULT_ONBOARDING_VIEW: ScholarsOnboardingView = "acceptance";

export function buildScholarsManagementNav(
  basePath: string
): ScholarsManagementNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return (
    Object.keys(SCHOLARS_MANAGEMENT_SECTION_LABELS) as ScholarsManagementSection[]
  ).map((section) => {
    if (section === "onboarding") {
      return {
        id: section,
        label: SCHOLARS_MANAGEMENT_SECTION_LABELS[section],
        section,
        nestedMenu: "onboarding",
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

export function buildScholarsOnboardingNav(
  basePath: string
): ScholarsOnboardingNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const scholarsBase = `${root}/scholars`;

  return SCHOLAR_ONBOARDING_NAV.map((item) => ({
    id: item.id,
    label: item.label,
    href:
      item.id === DEFAULT_ONBOARDING_VIEW
        ? scholarsBase
        : `${scholarsBase}?onboarding=${item.id}`,
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

export function parseScholarsOnboardingView(
  onboardingParam: string | null
): ScholarsOnboardingView {
  if (onboardingParam && onboardingParam in SCHOLARS_ONBOARDING_VIEW_LABELS) {
    return onboardingParam as ScholarsOnboardingView;
  }
  return DEFAULT_ONBOARDING_VIEW;
}

export function isScholarsOnboardingGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  return parseScholarsManagementSection(sectionParam) === "onboarding";
}

export function isScholarsOnboardingSubActive(
  item: ScholarsOnboardingNavItem,
  pathname: string,
  sectionParam: string | null,
  onboardingParam: string | null,
  basePath: string
): boolean {
  if (!isScholarsOnboardingGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  return parseScholarsOnboardingView(onboardingParam) === item.id;
}

export function isScholarsManagementSubActive(
  item: ScholarsManagementNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/scholars`) return false;
  if (item.nestedMenu === "onboarding") {
    return isScholarsOnboardingGroupActive(pathname, sectionParam, basePath);
  }
  return parseScholarsManagementSection(sectionParam) === item.section;
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
