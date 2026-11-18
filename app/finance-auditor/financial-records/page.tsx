import { Suspense } from "react";
import { FinanceAuditorFinancialRecords } from "../../components/finance-auditor-financial-records";

export const metadata = {
  title: "Financial Records | Finance Auditor | SMECC2E",
  description: "SMECC2E finance auditor financial records.",
};

export default function FinanceAuditorFinancialRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading financial records…
        </div>
      }
    >
      <FinanceAuditorFinancialRecords />
    </Suspense>
  );
}
