export type ProjectManagementSection =
  | "tasks"
  | "milestones"
  | "deliverables"
  | "meetings"
  | "capacity_building"
  | "m_and_e"
  | "risks"
  | "agreements";

export type ProjectManagementNavId = ProjectManagementSection;

export type ProjectManagementNavItem = {
  id: ProjectManagementNavId;
  label: string;
  href: string;
  section: ProjectManagementSection;
};

export const PROJECT_MANAGEMENT_SECTION_LABELS: Record<
  ProjectManagementSection,
  string
> = {
  tasks: "Tasks",
  milestones: "Milestones",
  deliverables: "Deliverables",
  meetings: "Meetings & Minutes",
  capacity_building: "Capacity Building",
  m_and_e: "M & E",
  risks: "Risks",
  agreements: "Agreements",
};

export function buildProjectManagementNav(
  basePath: string
): ProjectManagementNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const projectBase = `${root}/project`;

  return (
    Object.keys(PROJECT_MANAGEMENT_SECTION_LABELS) as ProjectManagementSection[]
  ).map((section) => ({
    id: section,
    label: PROJECT_MANAGEMENT_SECTION_LABELS[section],
    section,
    href:
      section === "tasks"
        ? projectBase
        : `${projectBase}?section=${section}`,
  }));
}

export function parseProjectManagementSection(
  sectionParam: string | null
): ProjectManagementSection {
  if (
    sectionParam &&
    sectionParam in PROJECT_MANAGEMENT_SECTION_LABELS &&
    sectionParam !== "tasks"
  ) {
    return sectionParam as ProjectManagementSection;
  }
  return "tasks";
}

export function isProjectManagementSubActive(
  item: ProjectManagementNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/project`) return false;
  if (item.section === "tasks") {
    return !sectionParam || sectionParam === "tasks";
  }
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
