import { Suspense } from "react";
import { FinanceOfficerFinancialRecords } from "../../components/finance-officer-financial-records";

export const metadata = {
  title: "Financial Records | Finance Officer | SMECC2E",
  description: "SMECC2E finance officer financial records.",
};

export default function FinanceOfficerFinancialRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading financial records…
        </div>
      }
    >
      <FinanceOfficerFinancialRecords />
    </Suspense>
  );
}
