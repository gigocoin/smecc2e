export type FinanceCoordinatorNavId =
  | "overview"
  | "financial_records"
  | "financial_reports"
  | "audit"
  | "profile";

export type FinanceCoordinatorNavItem = {
  id: FinanceCoordinatorNavId;
  label: string;
  href?: string;
  nestedMenu?: "financial_records";
};

export type FinanceRecordsView =
  | "first_pre_financing"
  | "second_pre_financing"
  | "third_pre_financing";

export type FinanceRecordsNavItem = {
  id: FinanceRecordsView;
  label: string;
  href: string;
};

export const FINANCE_RECORDS_VIEW_LABELS: Record<FinanceRecordsView, string> = {
  first_pre_financing: "1st Pre-Financing",
  second_pre_financing: "2nd Pre-Financing",
  third_pre_financing: "3rd Pre-Financing",
};

export const FINANCE_RECORDS_NAV: readonly {
  id: FinanceRecordsView;
  label: string;
}[] = [
  { id: "first_pre_financing", label: "1st Pre-Financing" },
  { id: "second_pre_financing", label: "2nd Pre-Financing" },
  { id: "third_pre_financing", label: "3rd Pre-Financing" },
];

const DEFAULT_RECORDS_VIEW: FinanceRecordsView = "first_pre_financing";

export function buildFinanceCoordinatorNav(
  basePath = "/finance-coordinator",
  options?: { includeReportsAndAudit?: boolean }
): FinanceCoordinatorNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const includeReportsAndAudit = options?.includeReportsAndAudit ?? true;
  return [
    { id: "overview", label: "Overview", href: root },
    {
      id: "financial_records",
      label: "Financial Records",
      nestedMenu: "financial_records",
    },
    ...(includeReportsAndAudit
      ? ([
          {
            id: "financial_reports",
            label: "Financial Reports",
            href: `${root}/financial-reports`,
          },
          { id: "audit", label: "Audit", href: `${root}/audit` },
        ] as FinanceCoordinatorNavItem[])
      : []),
    { id: "profile", label: "Profile", href: `${root}/profile` },
  ];
}

export function buildFinanceRecordsNav(
  basePath = "/finance-coordinator"
): FinanceRecordsNavItem[] {
  const root = basePath.replace(/\/$/, "");
  const recordsBase = `${root}/financial-records`;

  return FINANCE_RECORDS_NAV.map((item) => ({
    id: item.id,
    label: item.label,
    href:
      item.id === DEFAULT_RECORDS_VIEW
        ? recordsBase
        : `${recordsBase}?record=${item.id}`,
  }));
}

export function parseFinanceRecordsView(
  value: string | null | undefined
): FinanceRecordsView {
  const match = FINANCE_RECORDS_NAV.find((item) => item.id === value);
  return match?.id ?? DEFAULT_RECORDS_VIEW;
}

export const FINANCE_COORDINATOR_NAV = buildFinanceCoordinatorNav();

export function isFinanceCoordinatorNavActive(
  itemId: FinanceCoordinatorNavId,
  pathname: string,
  basePath = "/finance-coordinator"
): boolean {
  const root = basePath.replace(/\/$/, "");
  if (itemId === "financial_records") {
    return (
      pathname === `${root}/financial-records` ||
      pathname.startsWith(`${root}/financial-records/`)
    );
  }
  if (itemId === "financial_reports") {
    return (
      pathname === `${root}/financial-reports` ||
      pathname.startsWith(`${root}/financial-reports/`)
    );
  }
  if (itemId === "audit") {
    return (
      pathname === `${root}/audit` || pathname.startsWith(`${root}/audit/`)
    );
  }
  if (itemId === "profile") {
    return (
      pathname === `${root}/profile` || pathname.startsWith(`${root}/profile/`)
    );
  }
  return pathname === root;
}

export function isFinanceRecordsGroupActive(
  pathname: string,
  basePath = "/finance-coordinator"
): boolean {
  return isFinanceCoordinatorNavActive("financial_records", pathname, basePath);
}

export function isFinanceRecordsSubActive(
  item: FinanceRecordsNavItem,
  pathname: string,
  recordParam: string | null,
  basePath = "/finance-coordinator"
): boolean {
  if (!isFinanceRecordsGroupActive(pathname, basePath)) return false;
  return parseFinanceRecordsView(recordParam) === item.id;
}
