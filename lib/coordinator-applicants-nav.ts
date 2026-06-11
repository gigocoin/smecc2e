import type { ApplicationStatus } from "./application-types";

export type ApplicantsManagementNavId =
  | "programs"
  | "institutions"
  | "regions"
  | "applicants"
  | "criterion_weights"
  | "draft"
  | "evaluation"
  | "interview"
  | "final_evaluation"
  | "offered"
  | "reserved"
  | "rejected"
  | "pre_departure";

export type ApplicantsManagementNavItem = {
  id: ApplicantsManagementNavId;
  label: string;
  href: string;
  /** When set, highlights `/applicants` with this status query. */
  statusFilter?: ApplicationStatus;
};

/** Hidden from evaluator Applicants management flyout. */
export const EVALUATOR_APPLICANTS_MANAGEMENT_HIDDEN_IDS: ApplicantsManagementNavId[] =
  [
    "programs",
    "institutions",
    "regions",
    "applicants",
    "criterion_weights",
    "draft",
  ];

export function buildApplicantsManagementNav(
  basePath: string,
  options?: { hideIds?: ApplicantsManagementNavId[] }
): ApplicantsManagementNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const items: ApplicantsManagementNavItem[] = [
    { id: "programs", label: "Programs", href: `${root}/programs` },
    {
      id: "institutions",
      label: "Institutions",
      href: `${root}/institutions`,
    },
    { id: "regions", label: "Regions", href: `${root}/regions` },
    { id: "applicants", label: "Applicants", href: `${root}/applicants` },
    {
      id: "criterion_weights",
      label: "Manage Criterion Weight",
      href: `${root}/criterion-weights`,
    },
    {
      id: "draft",
      label: "Draft",
      href: `${root}/applicants?status=draft`,
      statusFilter: "draft",
    },
    {
      id: "evaluation",
      label: "Evaluation",
      href: `${root}/applicants?status=evaluation`,
      statusFilter: "evaluation",
    },
    {
      id: "interview",
      label: "Interview",
      href: `${root}/applicants?status=interview`,
      statusFilter: "interview",
    },
    {
      id: "final_evaluation",
      label: "Final Evaluation",
      href: `${root}/applicants?status=final_evaluation`,
      statusFilter: "final_evaluation",
    },
    {
      id: "offered",
      label: "Offered",
      href: `${root}/applicants?status=offered`,
      statusFilter: "offered",
    },
    {
      id: "reserved",
      label: "Reserved",
      href: `${root}/applicants?status=reserved`,
      statusFilter: "reserved",
    },
    {
      id: "rejected",
      label: "Rejected",
      href: `${root}/applicants?status=rejected`,
      statusFilter: "rejected",
    },
    {
      id: "pre_departure",
      label: "Pre-departure",
      href: `${root}/applicants?status=pre_departure`,
      statusFilter: "pre_departure",
    },
  ];

  const hideIds = options?.hideIds;
  if (!hideIds?.length) return items;
  return items.filter((item) => !hideIds.includes(item.id));
}

export function isApplicantsManagementSubActive(
  item: ApplicantsManagementNavItem,
  pathname: string,
  statusParam: string | null,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (item.id === "programs") return pathname === `${root}/programs`;
  if (item.id === "institutions") return pathname === `${root}/institutions`;
  if (item.id === "regions") return pathname === `${root}/regions`;
  if (item.id === "applicants") {
    return pathname === `${root}/applicants` && !statusParam;
  }
  if (item.id === "criterion_weights") {
    return pathname === `${root}/criterion-weights`;
  }
  if (item.statusFilter) {
    return (
      pathname === `${root}/applicants` && statusParam === item.statusFilter
    );
  }
  return false;
}

export function isApplicantsManagementGroupActive(
  items: ApplicantsManagementNavItem[],
  pathname: string,
  statusParam: string | null,
  basePath: string
): boolean {
  return items.some((item) =>
    isApplicantsManagementSubActive(item, pathname, statusParam, basePath)
  );
}
