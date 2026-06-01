import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ApplicationForm } from "../../components/application-form";

export const metadata = {
  title: "Application | Applicant | SMECC2E",
  description: "Complete your SMECC2E scholarship application.",
};

export const dynamic = "force-dynamic";

export default function ApplicantApplicationPage() {
  return (
    <div className="min-h-dvh bg-[#f0f4f8]">
      <header className="border-b border-slate-200 bg-[#062763] px-4 py-3 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 rounded-lg bg-white p-1">
              <Image src="/images/logo1.png" alt="SMECC2E" fill className="object-contain p-0.5" sizes="36px" unoptimized />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#f7be2a]">Applicant portal</p>
              <p className="text-sm font-semibold">Scholarship application form</p>
            </div>
          </div>
          <Link
            href="/applicant"
            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto w-[80%] py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-600">
              Loading application form…
            </div>
          }
        >
          <ApplicationForm portalMode />
        </Suspense>
      </main>
    </div>
  );
}
