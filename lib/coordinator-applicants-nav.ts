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
  | "approved"
  | "offered"
  | "reserved"
  | "rejected"
  | "pre_departure";

export type CriterionWeightsNavId = "evaluation" | "interview";

export type CriterionWeightsNavItem = {
  id: CriterionWeightsNavId;
  label: string;
  href: string;
};

export type ApplicantsManagementNavItem = {
  id: ApplicantsManagementNavId;
  label: string;
  href?: string;
  /** When set, highlights `/applicants` with this status query. */
  statusFilter?: ApplicationStatus;
  /** Renders a nested right flyout instead of a direct link. */
  nestedMenu?: "criterion_weights";
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
      nestedMenu: "criterion_weights",
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
      id: "approved",
      label: "Approved",
      href: `${root}/applicants?status=approved`,
      statusFilter: "approved",
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

export function buildCriterionWeightsNav(
  basePath: string
): CriterionWeightsNavItem[] {
  const root = basePath.replace(/\/$/, "");
  return [
    {
      id: "evaluation",
      label: "Evaluation Criterion weights",
      href: `${root}/criterion-weights`,
    },
    {
      id: "interview",
      label: "Interview criterion weights",
      href: `${root}/criterion-weights/interview`,
    },
  ];
}

export function isCriterionWeightsGroupActive(
  pathname: string,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  return (
    pathname === `${root}/criterion-weights` ||
    pathname.startsWith(`${root}/criterion-weights/`)
  );
}

export function isCriterionWeightsSubActive(
  item: CriterionWeightsNavItem,
  pathname: string,
  basePath: string
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (item.id === "evaluation") {
    return pathname === `${root}/criterion-weights`;
  }
  return pathname === `${root}/criterion-weights/interview`;
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
    return isCriterionWeightsGroupActive(pathname, basePath);
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
