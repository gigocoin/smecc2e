import { Suspense } from "react";
import { ScholarDashboard } from "../components/scholar-dashboard";

export const metadata = {
  title: "Scholar Dashboard | SMECC2E",
  description: "View your SMECC2E scholarship, mobility, and agreement.",
};

export const dynamic = "force-dynamic";

export default function ScholarHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm font-semibold text-[#062763]">
          Loading your scholar dashboard…
        </div>
      }
    >
      <ScholarDashboard />
    </Suspense>
  );
}
