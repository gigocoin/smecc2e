"use client";

import { useMemo } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import { buildScholarConfirmation } from "@/lib/scholar-confirmation-shared";

export function ScholarConfirmationModal({
  application,
  sending,
  error,
  onClose,
  onSend,
}: {
  application: ApplicationRecord;
  sending: boolean;
  error: string | null;
  onClose: () => void;
  onSend: () => void;
}) {
  const preview = useMemo(() => {
    const baseUrl =
      typeof window === "undefined" ? "" : window.location.origin;
    return buildScholarConfirmation(application, baseUrl);
  }, [application]);

  const recipientName =
    applicantDisplayName(application).trim() || application.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scholar-confirmation-title"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <h2
            id="scholar-confirmation-title"
            className="text-base font-bold text-[#062763]"
          >
            Scholarship confirmation
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Preview the confirmation email for{" "}
            <strong>{recipientName}</strong> ({application.id})
            {preview.to ? (
              <>
                {" "}
                at <strong>{preview.to}</strong>
              </>
            ) : null}
            . Sending it confirms the nomination and opens their scholar
            record.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-700">
                To
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {preview.to || "No email on record"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Subject
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {preview.subject}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-700">
            Email preview
          </p>
          <iframe
            title="Confirmation email preview"
            srcDoc={preview.html}
            sandbox=""
            className="mt-2 h-[28rem] w-full rounded-lg border border-slate-200 bg-slate-50"
          />

          {error && (
            <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !preview.to}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send confirmation"}
          </button>
        </div>
      </div>
    </div>
  );
}
