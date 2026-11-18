"use client";

import { FinanceCoordinatorSidebar } from "./finance-coordinator-sidebar";
import { FINANCE_AUDITOR_BASE_PATH } from "@/lib/finance-auditor-nav";

export function FinanceAuditorSidebar() {
  return (
    <FinanceCoordinatorSidebar
      basePath={FINANCE_AUDITOR_BASE_PATH}
      portalLabel="Finance Auditor"
      navAriaLabel="Finance auditor dashboard"
      includeReportsAndAudit
    />
  );
}
