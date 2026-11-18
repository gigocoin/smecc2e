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

export type FinanceAuditorNavId = FinanceCoordinatorNavId;
export type FinanceAuditorNavItem = FinanceCoordinatorNavItem;
export type {
  FinanceRecordsNavItem,
  FinanceRecordsView,
};

export { FINANCE_RECORDS_VIEW_LABELS, parseFinanceRecordsView };

export const FINANCE_AUDITOR_BASE_PATH = "/finance-auditor";

export const FINANCE_AUDITOR_NAV = buildFinanceCoordinatorNav(
  FINANCE_AUDITOR_BASE_PATH,
  { includeReportsAndAudit: true }
);

export function buildFinanceAuditorNav() {
  return buildFinanceCoordinatorNav(FINANCE_AUDITOR_BASE_PATH, {
    includeReportsAndAudit: true,
  });
}

export function buildFinanceAuditorRecordsNav() {
  return buildFinanceRecordsNav(FINANCE_AUDITOR_BASE_PATH);
}

export function isFinanceAuditorNavActive(
  itemId: FinanceAuditorNavId,
  pathname: string
): boolean {
  return isFinanceCoordinatorNavActive(
    itemId,
    pathname,
    FINANCE_AUDITOR_BASE_PATH
  );
}

export function isFinanceAuditorRecordsGroupActive(pathname: string): boolean {
  return isFinanceRecordsGroupActive(pathname, FINANCE_AUDITOR_BASE_PATH);
}

export function isFinanceAuditorRecordsSubActive(
  item: FinanceRecordsNavItem,
  pathname: string,
  recordParam: string | null
): boolean {
  return isFinanceRecordsSubActive(
    item,
    pathname,
    recordParam,
    FINANCE_AUDITOR_BASE_PATH
  );
}
