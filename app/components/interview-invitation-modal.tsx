"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
} from "@/lib/application-types";
import {
  buildInterviewInvitationMessage,
  formatInterviewInvitationDate,
  formatInterviewInvitationTime,
} from "@/lib/interview-invitation-shared";

const fieldClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

export function InterviewInvitationModal({
  application,
  open,
  sending,
  onClose,
  onSend,
}: {
  application: ApplicationRecord | null;
  open: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (details: {
    date: string;
    time: string;
    venue: string;
  }) => Promise<boolean>;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate("");
    setTime("");
    setVenue("");
    setFormError(null);
  }, [open, application?.id]);

  const previewMessage = useMemo(
    () =>
      buildInterviewInvitationMessage({
        date,
        time,
        venue,
      }),
    [date, time, venue]
  );

  if (!open || !application) return null;

  const recipientEmail = applicantPrimaryEmail(application).trim();
  const recipientName = applicantDisplayName(application).trim() || "Applicant";

  const handleSend = async () => {
    setFormError(null);
    if (!date.trim()) {
      setFormError("Select an interview date.");
      return;
    }
    if (!time.trim()) {
      setFormError("Select an interview time.");
      return;
    }
    if (!venue.trim()) {
      setFormError("Enter a venue or online link.");
      return;
    }
    if (!recipientEmail) {
      setFormError("This applicant does not have a valid email address.");
      return;
    }

    const ok = await onSend({
      date: date.trim(),
      time: time.trim(),
      venue: venue.trim(),
    });
    if (!ok) {
      setFormError("Could not send the interview invitation.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`interview-invitation-${application.id}-title`}
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={`interview-invitation-${application.id}-title`}
          className="text-base font-bold text-[#062763]"
        >
          Interview invitation
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          Send an interview invitation to{" "}
          <strong>{recipientName}</strong> ({application.id})
          {recipientEmail ? (
            <>
              {" "}
              at <strong>{recipientEmail}</strong>
            </>
          ) : null}
          .
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`interview-invitation-date-${application.id}`}
              className="block text-xs font-bold text-slate-800"
            >
              Date
            </label>
            <input
              id={`interview-invitation-date-${application.id}`}
              type="date"
              value={date}
              disabled={sending}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
            />
            {date && (
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {formatInterviewInvitationDate(date)}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor={`interview-invitation-time-${application.id}`}
              className="block text-xs font-bold text-slate-800"
            >
              Time
            </label>
            <input
              id={`interview-invitation-time-${application.id}`}
              type="time"
              value={time}
              disabled={sending}
              onChange={(e) => setTime(e.target.value)}
              className={fieldClass}
            />
            {time && (
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {formatInterviewInvitationTime(time)}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor={`interview-invitation-venue-${application.id}`}
              className="block text-xs font-bold text-slate-800"
            >
              Venue / Online link
            </label>
            <input
              id={`interview-invitation-venue-${application.id}`}
              type="text"
              value={venue}
              disabled={sending}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Zoom link or physical address"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Message preview
          </p>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
            {previewMessage}
          </pre>
        </div>

        {formError && (
          <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
            {formError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
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
            onClick={() => void handleSend()}
            disabled={sending}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}
