import Image from "next/image";
import { SiteFooter } from "./components/site-footer";
import {
  APPLICATION_GUIDELINE_DOWNLOAD_NAME,
  APPLICATION_GUIDELINE_PDF,
} from "@/lib/application-guidelines";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white text-slate-800">
      <header className="z-50 shrink-0 border-b border-white/10 bg-[#062763] text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-1.5 sm:px-8 sm:py-2">
          <div className="flex items-center justify-between gap-3">
            <ProjectLogo />
            <EuLogo />
          </div>
        </div>
      </header>

      <section className="relative flex-1 overflow-hidden border-b border-white/10 bg-[#062763] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(247,190,42,0.2),transparent_30%)]" />
        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-center px-4 py-2 text-center sm:px-8 sm:py-3">
          <div className="w-full max-w-7xl">
            <div>
              <p className="mb-1.5 inline-block rounded-full border border-[#f7be2a]/40 bg-[#f7be2a]/15 px-2 py-0.5 text-[0.55rem] font-bold uppercase leading-snug tracking-[0.08em] text-[#f7d46b] sm:mb-2 sm:px-2.5 sm:text-[0.58rem] sm:tracking-[0.1em]">
                EU-Supported Capacity Building Programme
              </p>
              <h1 className="text-balance text-lg font-black leading-tight text-white sm:text-base md:text-lg lg:text-xl xl:text-5x1">
                SMECC2E Integrated Mobility, Scholarship, Project & Knowledge Management Portal
              </h1>
              <p className="mx-auto mt-1.5 max-w-xl text-[0.7rem] leading-snug text-blue-50/90 sm:mt-2 sm:text-xs sm:leading-5">
                A secure, auditable, and scalable integrated portal for
                scholarships, mobility, academic tracking, financial
                accountability, reporting, and dissemination across the
                consortium.
              </p>
              <a
                href={APPLICATION_GUIDELINE_PDF}
                download={APPLICATION_GUIDELINE_DOWNLOAD_NAME}
                className="mr-2 mt-2 inline-block rounded-full bg-[#f7be2a] px-4 py-1.5 text-[1.5rem] font-extrabold uppercase tracking-[0.12em] text-[#062763] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 sm:mt-3 sm:px-5 sm:py-2 sm:text-[0.65rem] sm:tracking-[0.14em]"
              >
                Download Application Guidelines
              </a>
              <a
                href="/application?fresh=1"
                className="mt-2 inline-block rounded-full bg-[#f7be2a] px-4 py-1.5 text-[1.5rem] font-extrabold uppercase tracking-[0.12em] text-[#062763] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 sm:mt-3 sm:px-5 sm:py-2 sm:text-[0.65rem] sm:tracking-[0.14em]"
              >
                Start Application
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter compact />
    </main>
  );
}

function ProjectLogo() {
  return (
    <div className="relative h-10 w-[2.5rem] shrink-0 rounded-lg border border-slate-200 bg-white p-1 sm:h-12 sm:w-[3rem] sm:rounded-xl sm:p-1.5 md:h-14 md:w-[3.5rem] lg:h-16 lg:w-[4rem]">
      <Image
        src="/images/logo1.png"
        alt="SMECC2E logo"
        fill
        className="object-contain p-0.5 sm:p-1"
        sizes="(max-width: 640px) 56px, (max-width: 1024px) 96px, 112px"
        priority
      />
    </div>
  );
}

function EuLogo() {
  return (
    <div className="relative h-10 w-[2.7rem] shrink-0 rounded-lg border border-slate-200 bg-white p-1 sm:h-12 sm:w-[3.2rem] sm:rounded-xl sm:p-1.5 md:h-14 md:w-[3.8rem] lg:h-16 lg:w-[4.3rem]">
      <Image
        src="/images/logo2.png"
        alt="European Union funding logo"
        fill
        className="object-contain p-0.5 sm:p-1"
        sizes="(max-width: 640px) 60px, (max-width: 1024px) 103px, 121px"
        priority
      />
    </div>
  );
}
