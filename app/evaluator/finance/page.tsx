import { Suspense } from "react";
import { CoordinatorFinancial } from "../../components/coordinator-financial";

export const metadata = {
  title: "Financial management | Evaluator | SMECC2E",
  description: "SMECC2E evaluator financial management.",
};

export default function EvaluatorFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading financial management…
        </div>
      }
    >
      <CoordinatorFinancial />
    </Suspense>
  );
}
