import Image from "next/image";
import { SiteFooter } from "./components/site-footer";
import { HomeApplicationCtas } from "./components/home-application-ctas";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white text-slate-800">
      <header className="z-50 shrink-0 border-b border-white/10 bg-[#062763] text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-1 sm:px-8 sm:py-1.5">
          <div className="flex items-center justify-between gap-3">
            <ProjectLogo />
            <EuLogo />
          </div>
        </div>
      </header>

      <section className="relative flex-1 overflow-hidden border-b border-white/10 bg-[#062763] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(247,190,42,0.2),transparent_30%)]" />
        <div className="relative mx-auto flex h-full min-h-0 max-w-7xl items-center justify-center px-4 py-1 text-center sm:px-8 sm:py-2">
          <HomeApplicationCtas />
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
