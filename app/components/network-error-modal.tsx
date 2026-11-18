"use client";

export function NetworkErrorModal({
  open,
  title = "Connection problem",
  message,
  onClose,
  onRetry,
}: {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#062763]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-error-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-[#062763]/20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-[#062763] px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <svg
                className="h-5 w-5 text-[#f7be2a]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2
                id="network-error-title"
                className="text-base font-bold tracking-tight"
              >
                {title}
              </h2>
              <p className="mt-1 text-xs font-medium text-white/75">
                SMECC2E could not complete this request
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <p className="text-sm font-medium leading-6 text-slate-700">
            {message}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Close
            </button>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a3580]"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
