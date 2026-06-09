import { Suspense } from "react";
import { CoordinatorProject } from "../../components/coordinator-project";

export const metadata = {
  title: "Project management | Evaluator | SMECC2E",
  description: "SMECC2E evaluator project management.",
};

export default function EvaluatorProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading project management…
        </div>
      }
    >
      <CoordinatorProject />
    </Suspense>
  );
}
