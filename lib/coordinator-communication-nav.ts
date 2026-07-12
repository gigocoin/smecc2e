export type CommunicationKnowledgeSection =
  | "announcements"
  | "mails"
  | "newsletters"
  | "workshops"
  | "conferences"
  | "media_stories"
  | "documents";

export type CommunicationDocumentsView = "upload" | "categories";

export type CommunicationMailsView = "applicants" | "scholars" | "users";

export type CommunicationKnowledgeNavId = CommunicationKnowledgeSection;

export type CommunicationKnowledgeNavItem = {
  id: CommunicationKnowledgeNavId;
  label: string;
  href: string;
  section: CommunicationKnowledgeSection;
};

export type CommunicationDocumentsNavItem = {
  id: CommunicationDocumentsView;
  label: string;
  href: string;
  view: CommunicationDocumentsView;
};

export type CommunicationMailsNavItem = {
  id: CommunicationMailsView;
  label: string;
  href: string;
  view: CommunicationMailsView;
};

export const COMMUNICATION_KNOWLEDGE_SECTION_LABELS: Record<
  CommunicationKnowledgeSection,
  string
> = {
  announcements: "Announcements",
  mails: "Mails",
  newsletters: "Newsletters",
  workshops: "Workshops",
  conferences: "Conferences",
  media_stories: "Media & Stories",
  documents: "Documents",
};

export const COMMUNICATION_DOCUMENTS_VIEW_LABELS: Record<
  CommunicationDocumentsView,
  string
> = {
  upload: "View/Upload Documents",
  categories: "Manage Document Category",
};

export const COMMUNICATION_MAILS_VIEW_LABELS: Record<
  CommunicationMailsView,
  string
> = {
  applicants: "Applicants",
  scholars: "Scholars",
  users: "Users (Team Members)",
};

/** Hidden from evaluator Communication & Knowledge flyout. */
export const EVALUATOR_COMMUNICATION_KNOWLEDGE_HIDDEN_IDS: CommunicationKnowledgeNavId[] =
  ["documents"];

export function buildCommunicationKnowledgeNav(
  basePath: string,
  options?: { hideIds?: CommunicationKnowledgeNavId[] }
): CommunicationKnowledgeNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const base = `${root}/communication`;

  const items = (
    Object.keys(
      COMMUNICATION_KNOWLEDGE_SECTION_LABELS
    ) as CommunicationKnowledgeSection[]
  ).map((section) => ({
    id: section,
    label: COMMUNICATION_KNOWLEDGE_SECTION_LABELS[section],
    section,
    href:
      section === "announcements"
        ? base
        : `${base}?section=${section}`,
  }));

  const hideIds = options?.hideIds;
  if (!hideIds?.length) return items;
  return items.filter((item) => !hideIds.includes(item.id));
}

export function buildCommunicationDocumentsNav(
  basePath: string
): CommunicationDocumentsNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const base = `${root}/communication?section=documents`;

  return [
    {
      id: "upload",
      label: COMMUNICATION_DOCUMENTS_VIEW_LABELS.upload,
      href: base,
      view: "upload",
    },
    {
      id: "categories",
      label: COMMUNICATION_DOCUMENTS_VIEW_LABELS.categories,
      href: `${base}&view=categories`,
      view: "categories",
    },
  ];
}

export function buildCommunicationMailsNav(
  basePath: string
): CommunicationMailsNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const base = `${root}/communication?section=mails`;

  return [
    {
      id: "applicants",
      label: COMMUNICATION_MAILS_VIEW_LABELS.applicants,
      href: base,
      view: "applicants",
    },
    {
      id: "scholars",
      label: COMMUNICATION_MAILS_VIEW_LABELS.scholars,
      href: `${base}&view=scholars`,
      view: "scholars",
    },
    {
      id: "users",
      label: COMMUNICATION_MAILS_VIEW_LABELS.users,
      href: `${base}&view=users`,
      view: "users",
    },
  ];
}

export function parseCommunicationDocumentsView(
  viewParam: string | null
): CommunicationDocumentsView {
  return viewParam === "categories" ? "categories" : "upload";
}

export function parseCommunicationMailsView(
  viewParam: string | null
): CommunicationMailsView {
  if (viewParam === "scholars") return "scholars";
  if (viewParam === "users") return "users";
  return "applicants";
}

export function parseCommunicationKnowledgeSection(
  sectionParam: string | null
): CommunicationKnowledgeSection {
  if (
    sectionParam &&
    sectionParam in COMMUNICATION_KNOWLEDGE_SECTION_LABELS &&
    sectionParam !== "announcements"
  ) {
    return sectionParam as CommunicationKnowledgeSection;
  }
  return "announcements";
}

export function isCommunicationKnowledgeSubActive(
  item: CommunicationKnowledgeNavItem,
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (pathname !== `${root}/communication`) return false;
  if (item.section === "announcements") {
    return !sectionParam || sectionParam === "announcements";
  }
  return sectionParam === item.section;
}

export function isCommunicationKnowledgeGroupActive(
  items: CommunicationKnowledgeNavItem[],
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  return items.some((item) =>
    isCommunicationKnowledgeSubActive(item, pathname, sectionParam, basePath)
  );
}

export function isCommunicationDocumentsGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  return pathname === `${root}/communication` && sectionParam === "documents";
}

export function isCommunicationDocumentsSubActive(
  item: CommunicationDocumentsNavItem,
  pathname: string,
  sectionParam: string | null,
  viewParam: string | null,
  basePath: string
): boolean {
  if (!isCommunicationDocumentsGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  if (item.view === "categories") {
    return viewParam === "categories";
  }
  return viewParam !== "categories";
}

export function isCommunicationMailsGroupActive(
  pathname: string,
  sectionParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  return pathname === `${root}/communication` && sectionParam === "mails";
}

export function isCommunicationMailsSubActive(
  item: CommunicationMailsNavItem,
  pathname: string,
  sectionParam: string | null,
  viewParam: string | null,
  basePath: string
): boolean {
  if (!isCommunicationMailsGroupActive(pathname, sectionParam, basePath)) {
    return false;
  }
  if (item.view === "applicants") {
    return !viewParam || viewParam === "applicants";
  }
  return viewParam === item.view;
}
