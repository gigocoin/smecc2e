import { Suspense } from "react";
import { FinanceOfficerSidebar } from "../components/finance-officer-sidebar";
import { IdleSessionGuard } from "../components/idle-session-guard";

export const metadata = {
  title: "Finance Officer Dashboard | SMECC2E",
  description: "Review SMECC2E scholarship and partner financial records.",
};

export default function FinanceOfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <IdleSessionGuard />
      <div className="min-h-dvh bg-white">
        <Suspense fallback={null}>
          <FinanceOfficerSidebar />
        </Suspense>
        <div className="min-h-dvh lg:pl-72">
          <Suspense
            fallback={
              <div className="flex min-h-dvh flex-1 items-center justify-center p-12 text-sm text-slate-600">
                Loading…
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </div>
    </>
  );
}
