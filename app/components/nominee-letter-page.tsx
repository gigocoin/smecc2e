"use client";

import Image from "next/image";

/**
 * One printable page in the nomination-letter modal.
 * Every page mirrors the page-1 letterhead header and partner-footer strip.
 */
export function NomineeLetterPage({
  pageNumber,
  totalPages,
  children,
  priorityHeader = false,
}: {
  pageNumber: number;
  totalPages: number;
  children: React.ReactNode;
  priorityHeader?: boolean;
}) {
  return (
    <article
      className="flex min-h-280 flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      aria-label={`Page ${pageNumber} of ${totalPages}`}
    >
      <header className="shrink-0 border-b border-slate-200 pb-4">
        <Image
          src="/images/letter-header.jpg"
          alt="SMECC2E Cross Regional Intra-Africa Mobility Project, African Union, Co-funded by the European Union"
          width={1024}
          height={157}
          priority={priorityHeader}
          className="h-auto w-full"
        />
      </header>

      <div className="flex flex-1 flex-col gap-4 py-5">{children}</div>

      <footer className="mt-auto shrink-0 space-y-3 border-t border-slate-200 pt-4">
        <div className="text-left">
          <Image
            src="/images/letter-footer.png"
            alt="Implemented by the SMECC2E partner universities — https://smecc2e.unn.edu.ng/"
            width={411}
            height={109}
            className="h-auto w-full max-w-102.75"
          />
        </div>
        <p className="text-right text-xs font-semibold text-slate-500">
          Page {pageNumber} of {totalPages}
        </p>
      </footer>
    </article>
  );
}
