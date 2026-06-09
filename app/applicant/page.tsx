import Image from "next/image";
import Link from "next/link";
import { ApplicantDashboard } from "../components/applicant-dashboard";

export const metadata = {
  title: "Applicant Dashboard | SMECC2E",
  description: "Continue and manage your SMECC2E scholarship application.",
};

export const dynamic = "force-dynamic";

export default function ApplicantHomePage() {
  return (
    <div className="min-h-dvh bg-[#062763]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 rounded-lg bg-white p-1">
            <Image src="/images/logo1.png" alt="SMECC2E" fill className="object-contain p-0.5" sizes="36px" unoptimized />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#f7be2a]">SMECC2E</p>
            <p className="text-xs font-semibold text-white sm:text-sm">Scholarship application portal</p>
          </div>
        </div>
      </header>
      <main className="px-6 py-10">
        <ApplicantDashboard />
      </main>
    </div>
  );
}
