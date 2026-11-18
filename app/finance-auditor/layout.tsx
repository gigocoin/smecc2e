import { Suspense } from "react";
import { FinanceAuditorSidebar } from "../components/finance-auditor-sidebar";
import { IdleSessionGuard } from "../components/idle-session-guard";

export const metadata = {
  title: "Finance Auditor Dashboard | SMECC2E",
  description: "Review SMECC2E scholarship and partner financial records.",
};

export default function FinanceAuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <IdleSessionGuard />
      <div className="min-h-dvh bg-white">
        <Suspense fallback={null}>
          <FinanceAuditorSidebar />
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
