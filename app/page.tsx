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
        <div className="relative mx-auto max-w-7xl px-4 py-2 sm:px-8 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <ProjectLogo />
            <EuLogo />
          </div>
        </div>
      </header>

      <section className="relative flex-1 overflow-hidden border-b border-white/10 bg-[#062763] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(247,190,42,0.2),transparent_30%)]" />
        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-center px-4 py-3 text-center sm:px-8 sm:py-4">
          <div className="w-full max-w-7xl">
            <div>
              <p className="mb-2 inline-block rounded-full border border-[#f7be2a]/40 bg-[#f7be2a]/15 px-2.5 py-1 text-[1rem] font-bold uppercase leading-snug tracking-[0.08em] text-[#f7d46b] sm:mb-3 sm:px-3 sm:text-[0.62rem] sm:tracking-[0.1em]">
                EU-Supported Capacity Building Programme
              </p>
              <h1 className="text-balance text-xl font-black leading-tight text-white sm:text-2xl lg:text-6xl">
                SMECC2E Integrated Mobility, Scholarship, Project & Knowledge Management Portal
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-lg leading-5 text-blue-50/90 sm:mt-3 sm:text-sm sm:leading-6">
                A secure, auditable, and scalable integrated portal for
                scholarships, mobility, academic tracking, financial
                accountability, reporting, and dissemination across the
                consortium.
              </p>
              <a
                href={APPLICATION_GUIDELINE_PDF}
                download={APPLICATION_GUIDELINE_DOWNLOAD_NAME}
                className="mr-3 mt-3 inline-block rounded-full bg-[#f7be2a] px-5 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-[#062763] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 sm:mt-4 sm:px-6 sm:py-2.5 sm:text-xs sm:tracking-[0.16em]"
              >
                Download Application Guidelines
              </a>
              <a
                href="/application?fresh=1"
                className="mt-3 inline-block rounded-full bg-[#f7be2a] px-5 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-[#062763] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 sm:mt-4 sm:px-6 sm:py-2.5 sm:text-xs sm:tracking-[0.16em]"
              >
                Start Application
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function ProjectLogo() {
  return (
    <div className="relative h-14 w-[3.5rem] shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 sm:h-20 sm:w-[5.05rem] sm:rounded-xl sm:p-2 md:h-24 md:w-[6.06rem] lg:h-28 lg:w-[7.07rem]">
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
    <div className="relative h-14 w-[3.75rem] shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 sm:h-20 sm:w-[5.4rem] sm:rounded-xl sm:p-2 md:h-24 md:w-[6.48rem] lg:h-28 lg:w-[7.56rem]">
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
