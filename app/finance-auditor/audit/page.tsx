import { FinanceCoordinatorPlaceholderPage } from "../../components/finance-coordinator-placeholder-page";

export const metadata = {
  title: "Audit | Finance Auditor | SMECC2E",
  description: "SMECC2E finance auditor audit workspace.",
};

export default function FinanceAuditorAuditPage() {
  return (
    <FinanceCoordinatorPlaceholderPage
      title="Audit"
      description="Track audit activity, findings, and follow-up actions across finance records and reports."
      workspaceLabel="Finance Auditor workspace"
    />
  );
}
