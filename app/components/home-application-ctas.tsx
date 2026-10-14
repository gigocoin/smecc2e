import {
  APPLICATION_GUIDELINE_DOWNLOAD_NAME,
  APPLICATION_GUIDELINE_PDF,
} from "@/lib/application-guidelines";

const COHORT_CLOSED_MESSAGE =
  "Application for the 1st Cohort closed on 16th July 2026.";

export function HomeApplicationCtas() {
  return (
    <div className="w-full max-w-7xl">
      <div className="mb-3 rounded-xl border border-[#f7be2a]/35 bg-[#041a42]/55 px-3 py-2.5 backdrop-blur-sm sm:mb-4 sm:px-4 sm:py-3">
        <p className="text-[clamp(0.8rem,2.4dvh+0.4rem,1rem)] font-bold text-[#f7d46b]">
          {COHORT_CLOSED_MESSAGE}
        </p>
      </div>

      <div>
        <p className="mb-2 inline-block rounded-full border border-[#f7be2a]/40 bg-[#f7be2a]/15 px-2.5 py-0.5 text-[clamp(0.7rem,3.1dvh+0.45rem,1.2rem)] font-bold uppercase leading-snug tracking-[0.08em] text-[#f7d46b] sm:mb-1.5 sm:px-3 sm:tracking-[0.1em]">
          EU-Supported Capacity Building Programme
        </p>
        <h1 className="text-balance text-[clamp(1.25rem,6.4dvh+0.6rem,4.25rem)] font-black leading-[1.12] text-white">
          SMECC2E Integrated Mobility, Scholarship, Project & Knowledge
          Management Portal
        </h1>
        <br />
        <p className="mx-auto mt-1.5 max-w-2xl text-[clamp(0.9rem,4.6dvh+0.45rem,1.125rem)] leading-snug text-blue-50/90 sm:mt-2">
          A secure, auditable, and scalable integrated portal for scholarships,
          mobility, academic tracking, financial accountability, reporting, and
          dissemination across the consortium.
        </p>
        <br />
        <a
          href={APPLICATION_GUIDELINE_PDF}
          download={APPLICATION_GUIDELINE_DOWNLOAD_NAME}
          className="mr-2 mt-2 inline-block rounded-full bg-[#f7be2a] px-4 py-1.5 text-[clamp(0.8rem,1.2dvh+0.45rem,1rem)] font-extrabold uppercase tracking-[0.12em] text-[#062763] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 sm:mt-2.5 sm:px-5 sm:py-2 sm:tracking-[0.14em]"
        >
          Download Application Guidelines
        </a>
        <span
          aria-disabled="true"
          title={COHORT_CLOSED_MESSAGE}
          className="mt-2 inline-block cursor-not-allowed rounded-full bg-[#f7be2a]/40 px-4 py-1.5 text-[clamp(0.8rem,1.2dvh+0.45rem,1rem)] font-extrabold uppercase tracking-[0.12em] text-[#062763]/60 sm:mt-2.5 sm:px-5 sm:py-2 sm:tracking-[0.14em]"
        >
          Start Application
        </span>
      </div>
    </div>
  );
}
