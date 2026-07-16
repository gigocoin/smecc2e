"use client";

import { useEffect, useState } from "react";
import {
  APPLICATION_DEADLINE,
  getApplicationCountdown,
  type ApplicationCountdown,
} from "@/lib/application-deadline";
import {
  APPLICATION_GUIDELINE_DOWNLOAD_NAME,
  APPLICATION_GUIDELINE_PDF,
} from "@/lib/application-guidelines";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function CountdownUnit({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[3.25rem] rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-center sm:min-w-[3.75rem] sm:px-2.5 sm:py-2">
      <p className="font-mono text-[clamp(1rem,3.5dvh+0.35rem,1.75rem)] font-black leading-none text-white tabular-nums">
        {pad(value)}
      </p>
      <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#f7d46b] sm:text-xs">
        {label}
      </p>
    </div>
  );
}

export function HomeApplicationCtas() {
  const [countdown, setCountdown] = useState<ApplicationCountdown | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(getApplicationCountdown());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const expired = countdown?.expired ?? false;
  const deadlineLabel = APPLICATION_DEADLINE.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-3 rounded-xl border border-[#f7be2a]/35 bg-[#041a42]/55 px-3 py-2.5 backdrop-blur-sm sm:mb-4 sm:px-4 sm:py-3">
        {expired ? (
          <p className="text-[clamp(0.8rem,2.4dvh+0.4rem,1rem)] font-bold text-[#f7d46b]">
            Application deadline has passed ({deadlineLabel}). New applications
            are closed.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <p className="text-[clamp(0.75rem,2.2dvh+0.35rem,0.95rem)] font-bold uppercase tracking-[0.1em] text-[#f7d46b]">
              Application deadline — 12:00 AM, 17 July 2026
            </p>
            {countdown && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <CountdownUnit label="Days" value={countdown.days} />
                <CountdownUnit label="Hours" value={countdown.hours} />
                <CountdownUnit label="Mins" value={countdown.minutes} />
                <CountdownUnit label="Secs" value={countdown.seconds} />
              </div>
            )}
          </div>
        )}
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
        {expired ? (
          <span
            aria-disabled="true"
            title="Application deadline has passed"
            className="mt-2 inline-block cursor-not-allowed rounded-full bg-[#f7be2a]/40 px-4 py-1.5 text-[clamp(0.8rem,1.2dvh+0.45rem,1rem)] font-extrabold uppercase tracking-[0.12em] text-[#062763]/60 sm:mt-2.5 sm:px-5 sm:py-2 sm:tracking-[0.14em]"
          >
            Applications Closed
          </span>
        ) : (
          <a
            href="/application?fresh=1"
            className="mt-2 inline-block rounded-full bg-[#f7be2a] px-4 py-1.5 text-[clamp(0.8rem,1.2dvh+0.45rem,1rem)] font-extrabold uppercase tracking-[0.12em] text-[#062763] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 sm:mt-2.5 sm:px-5 sm:py-2 sm:tracking-[0.14em]"
          >
            Start Application
          </a>
        )}
      </div>
    </div>
  );
}
