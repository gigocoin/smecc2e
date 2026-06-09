import { Suspense } from "react";
import { CoordinatorDashboard } from "../components/coordinator-dashboard";

export default function EvaluatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading dashboard…
        </div>
      }
    >
      <CoordinatorDashboard />
    </Suspense>
  );
}
