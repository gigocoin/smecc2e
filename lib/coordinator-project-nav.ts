export type ProjectManagementSection =
  | "project_management_coordination"
  | "scholarship_selection_management"
  | "communication_dissemination"
  | "milestones"
  | "deliverables"
  | "meetings"
  | "capacity_building"
  | "m_and_e"
  | "risks"
  | "agreements";

export type ProjectManagementNavId =
  | "work_packages"
  | Exclude<
      ProjectManagementSection,
      | "project_management_coordination"
      | "scholarship_selection_management"
      | "communication_dissemination"
    >;

export type WorkPackageNavId =
  | "project_management_coordination"
  | "scholarship_selection_management"
  | "communication_dissemination";

export type WorkPackageNavItem = {
  id: WorkPackageNavId;
  label: string;
  href: string;
  section: WorkPackageNavId;
};

export type ProjectManagementNavItem = {
  id: ProjectManagementNavId;
  label: string;
  href?: string;
  section?: ProjectManagementSection;
  /** Renders a nested right flyout instead of a direct link. */
  nestedMenu?: "work_packages";
};

export const WORK_PACKAGE_SECTION_LABELS: Record<WorkPackageNavId, string> = {
  project_management_coordination: "Project Management & Coordination",
  scholarship_selection_management: "Scholarship Selection & Management",
  communication_dissemination: "Communication & Dissemination",
};

export const PROJECT_MANAGEMENT_SECTION_LABELS: Record<
  ProjectManagementSection,
  string
> = {
  ...WORK_PACKAGE_SECTION_LABELS,
  milestones: "Milestones",
  deliverables: "Deliverables",
  meetings: "Meetings & Minutes",
  capacity_building: "Capacity Building",
  m_and_e: "M & E",
  risks: "Risks",
  agreements: "Agreements",
};

const DEFAULT_PROJECT_SECTION: ProjectManagementSection =
  "project_management_coordination";

export function buildWorkPackagesNav(basePath: string): WorkPackageNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const projectBase = `${root}/project`;

  return (
    Object.keys(WORK_PACKAGE_SECTION_LABELS) as WorkPackageNavId[]
  ).map((section, index) => ({
    id: section,
    label: WORK_PACKAGE_SECTION_LABELS[section],
    section,
    href:
      index === 0 ? projectBase : `${projectBase}?section=${section}`,
  }));
}

export function buildProjectManagementNav(
  basePath: string
): ProjectManagementNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const projectBase = `${root}/project`;

  const topLevelSections: Exclude<
    ProjectManagementNavId,
    "work_packages"
  >[] = [
    "milestones",
    "deliverables",
    "meetings",
    "capacity_building",
    "m_and_e",
    "risks",
    "agreements",
  ];

  return [
    {
      id: "work_packages",
      label: "Work Packages",
      nestedMenu: "work_packages",
    },
    ...topLevelSections.map((section) => ({
      id: section,
      label: PROJECT_MANAGEMENT_SECTION_LABELS[section],
      section,
      href: `${projectBase}?section=${section}`,
    })),
  ];
}

export function parseProjectManagementSection(
  sectionParam: string | null
): ProjectManagementSection {
  if (sectionParam && sectionParam in PROJECT_MANAGEMENT_SECTION_LABELS) {
    return sectionParam as ProjectManagementSection;
  }
  // Legacy ?section=tasks bookmarks land on the first work package.
  return DEFAULT_PROJECT_SECTION;
}

export function isWorkPackageSection(
  section: ProjectManagementSection
): section is WorkPackageNavId {
  return section in WORK_PACKAGE_SECTION_LABELS;
}

export function isWorkPackagesGroupActive(
  sectionParam: string | null
): boolean {
  if (!sectionParam || sectionParam === "tasks") return true;
  return sectionParam in WORK_PACKAGE_SECTION_LABELS;
}

export function isWorkPackageSubActive(
  item: WorkPackageNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/project`) return false;
  const activeSection = parseProjectManagementSection(sectionParam);
  return activeSection === item.section;
}

export function isProjectManagementSubActive(
  item: ProjectManagementNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/project`) return false;
  if (item.nestedMenu === "work_packages") {
    return isWorkPackagesGroupActive(sectionParam);
  }
  if (!item.section) return false;
  return sectionParam === item.section;
}

export function isProjectManagementGroupActive(
  items: ProjectManagementNavItem[],
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  return items.some((item) =>
    isProjectManagementSubActive(item, pathname, sectionParam, basePath)
  );
}
