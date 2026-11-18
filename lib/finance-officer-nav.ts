import {
  buildFinanceCoordinatorNav,
  buildFinanceRecordsNav,
  isFinanceCoordinatorNavActive,
  isFinanceRecordsGroupActive,
  isFinanceRecordsSubActive,
  parseFinanceRecordsView,
  FINANCE_RECORDS_VIEW_LABELS,
  type FinanceCoordinatorNavId,
  type FinanceCoordinatorNavItem,
  type FinanceRecordsNavItem,
  type FinanceRecordsView,
} from "@/lib/finance-coordinator-nav";

export type FinanceOfficerNavId = FinanceCoordinatorNavId;
export type FinanceOfficerNavItem = FinanceCoordinatorNavItem;
export type {
  FinanceRecordsNavItem,
  FinanceRecordsView,
};

export { FINANCE_RECORDS_VIEW_LABELS, parseFinanceRecordsView };

export const FINANCE_OFFICER_BASE_PATH = "/finance-officer";

export const FINANCE_OFFICER_NAV = buildFinanceCoordinatorNav(
  FINANCE_OFFICER_BASE_PATH,
  { includeReportsAndAudit: false }
);

export function buildFinanceOfficerNav() {
  return buildFinanceCoordinatorNav(FINANCE_OFFICER_BASE_PATH, {
    includeReportsAndAudit: false,
  });
}

export function buildFinanceOfficerRecordsNav() {
  return buildFinanceRecordsNav(FINANCE_OFFICER_BASE_PATH);
}

export function isFinanceOfficerNavActive(
  itemId: FinanceOfficerNavId,
  pathname: string
): boolean {
  return isFinanceCoordinatorNavActive(
    itemId,
    pathname,
    FINANCE_OFFICER_BASE_PATH
  );
}

export function isFinanceOfficerRecordsGroupActive(pathname: string): boolean {
  return isFinanceRecordsGroupActive(pathname, FINANCE_OFFICER_BASE_PATH);
}

export function isFinanceOfficerRecordsSubActive(
  item: FinanceRecordsNavItem,
  pathname: string,
  recordParam: string | null
): boolean {
  return isFinanceRecordsSubActive(
    item,
    pathname,
    recordParam,
    FINANCE_OFFICER_BASE_PATH
  );
}
