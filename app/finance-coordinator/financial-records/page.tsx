import { Suspense } from "react";
import { FinanceCoordinatorFinancialRecords } from "../../components/finance-coordinator-financial-records";

export const metadata = {
  title: "Financial Records | Finance Coordinator | SMECC2E",
  description: "SMECC2E finance coordinator financial records.",
};

export default function FinanceCoordinatorFinancialRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading financial records…
        </div>
      }
    >
      <FinanceCoordinatorFinancialRecords />
    </Suspense>
  );
}
