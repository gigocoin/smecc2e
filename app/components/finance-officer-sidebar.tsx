"use client";

import { FinanceCoordinatorSidebar } from "./finance-coordinator-sidebar";
import { FINANCE_OFFICER_BASE_PATH } from "@/lib/finance-officer-nav";

export function FinanceOfficerSidebar() {
  return (
    <FinanceCoordinatorSidebar
      basePath={FINANCE_OFFICER_BASE_PATH}
      portalLabel="Finance Officer"
      navAriaLabel="Finance officer dashboard"
      includeReportsAndAudit={false}
    />
  );
}
