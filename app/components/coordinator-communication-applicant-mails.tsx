"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  STATUS_LABELS,
  type ApplicationRecord,
} from "@/lib/application-types";
import { applicantMailRecipient } from "@/lib/communication-applicant-mail-shared";
import type { ApplicantMailSendMode } from "@/lib/communication-applicant-mail-shared";
import { formatDate, StatusBadge } from "./coordinator-shared";

type RecipientMode = ApplicantMailSendMode;

const bulkRecipientModes = new Set<RecipientMode>([
  "all",
  "eligibility_checks",
  "draft",
]);

const modeOptions: { id: RecipientMode; label: string; description: string }[] =
  [
    {
      id: "all",
      label: "All applicants",
      description:
        "Send to every applicant with a valid email, including drafts and eligibility checks",
    },
    {
      id: "eligibility_checks",
      label: "Eligibility Checks applicants",
      description: `Send to all applicants in ${STATUS_LABELS.under_review} status`,
    },
    {
      id: "draft",
      label: "Draft applicants",
      description: "Send to all in-progress draft applications with a valid email",
    },
    {
      id: "single",
      label: "One applicant",
      description: "Choose a single applicant from the list",
    },
    {
      id: "selected",
      label: "Selected applicants",
      description: "Tick multiple applicants to include in this send",
    },
  ];

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const actionBtnClass =
  "rounded-lg border-2 px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

export function CommunicationApplicantMailsSection({
  canSend,
}: {
  canSend: boolean;
}) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<RecipientMode>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/applications");
      const data = (await res.json()) as {
        applications?: ApplicationRecord[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load applicants.");
        setApplications([]);
        return;
      }
      setApplications(data.applications ?? []);
    } catch {
      setLoadError("Could not load applicants.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const poolApplications = useMemo(() => {
    switch (mode) {
      case "draft":
        return applications.filter((app) => app.status === "draft");
      case "eligibility_checks":
        return applications.filter((app) => app.status === "under_review");
      case "all":
        return applications;
      default:
        return applications;
    }
  }, [applications, mode]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base =
      mode === "single" || mode === "selected" ? applications : poolApplications;
    if (!query) return base;
    return base.filter((app) => {
      const haystack = [
        app.id,
        applicantDisplayName(app),
        applicantPrimaryEmail(app),
        app.typeOfMobility,
        STATUS_LABELS[app.status],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, poolApplications, search, mode]);

  const mailableApplications = useMemo(
    () =>
      poolApplications.filter((app) => applicantMailRecipient(app) != null),
    [poolApplications]
  );

  const recipientCount = useMemo(() => {
    if (bulkRecipientModes.has(mode)) return mailableApplications.length;
    return selectedIds.filter((id) =>
      mailableApplications.some((app) => app.id === id)
    ).length;
  }, [mode, mailableApplications, selectedIds]);

  const toggleSelection = (applicationId: string) => {
    setSendSuccess(null);
    setSendError(null);

    if (mode === "single") {
      setSelectedIds([applicationId]);
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const selectAllVisible = () => {
    const visibleMailable = filteredApplications
      .filter((app) => applicantMailRecipient(app) != null)
      .map((app) => app.id);
    setSelectedIds((prev) => [...new Set([...prev, ...visibleMailable])]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleModeChange = (nextMode: RecipientMode) => {
    setMode(nextMode);
    setSelectedIds([]);
    setSendSuccess(null);
    setSendError(null);
  };

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await fetch("/api/communication/mails/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          subject,
          message,
          applicationIds: bulkRecipientModes.has(mode) ? undefined : selectedIds,
        }),
      });
      const data = (await res.json()) as {
        sent?: number;
        failed?: number;
        total?: number;
        warning?: string;
        error?: string;
        errors?: string[];
      };

      if (!res.ok) {
        setSendError(data.error ?? "Could not send email.");
        return;
      }

      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      const warning = data.warning?.trim();

      if (warning) {
        setSendSuccess(
          `Prepared email for ${sent} recipient${sent === 1 ? "" : "s"} (development mode). ${warning}`
        );
      } else if (failed > 0) {
        setSendSuccess(
          `Sent to ${sent} recipient${sent === 1 ? "" : "s"}. ${failed} failed.`
        );
        if (data.errors?.length) {
          setSendError(data.errors.slice(0, 3).join(" "));
        }
      } else {
        setSendSuccess(
          `Email sent to ${sent} recipient${sent === 1 ? "" : "s"}.`
        );
        setSubject("");
        setMessage("");
        if (mode !== "single" && mode !== "selected") setSelectedIds([]);
      }
    } catch {
      setSendError("Could not send email.");
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  const canSubmit =
    canSend &&
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    recipientCount > 0 &&
    !sending;

  return (
    <div className="space-y-6">
      {!canSend && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          role="status"
        >
          Only coordinators and administrators can send applicant emails.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-[#062763]">Recipients</h2>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Choose who should receive this email.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {modeOptions.map((option) => {
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={!canSend}
                onClick={() => handleModeChange(option.id)}
                className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                  active
                    ? "border-[#062763] bg-[#062763]/5"
                    : "border-slate-200 bg-white hover:border-[#062763]/30"
                } disabled:opacity-50`}
              >
                <span className="block text-sm font-bold text-[#062763]">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-600">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            {recipientCount} recipient{recipientCount === 1 ? "" : "s"} selected
            {bulkRecipientModes.has(mode)
              ? ` · ${mailableApplications.length} applicants with email`
              : null}
          </p>
          {mode === "selected" && canSend && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className={`${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
              >
                Select visible
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className={`${actionBtnClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {!bulkRecipientModes.has(mode) && (
          <div className="mt-4">
            <label
              htmlFor="applicant-mail-search"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Find applicants
            </label>
            <input
              id="applicant-mail-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, application ID, mobility, or status"
              className={inputClass}
            />
          </div>
        )}
      </section>

      {!bulkRecipientModes.has(mode) && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loadError && (
            <p
              className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {loadError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#062763] text-left text-xs font-bold text-white">
                  <th className="w-12 px-3 py-2">
                    {mode === "single" ? "Pick" : "Select"}
                  </th>
                  <th className="px-3 py-2">Application No.</th>
                  <th className="px-3 py-2">Applicant</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Mobility</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm font-medium text-slate-600"
                    >
                      Loading applicants…
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm font-medium text-slate-600"
                    >
                      No applicants match your search.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const recipient = applicantMailRecipient(app);
                    const selected = selectedIds.includes(app.id);
                    const disabled = !canSend || recipient == null;

                    return (
                      <tr
                        key={app.id}
                        className={`border-t border-slate-100 ${
                          selected ? "bg-[#062763]/5" : "bg-white"
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type={mode === "single" ? "radio" : "checkbox"}
                            name="applicant-mail-recipient"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleSelection(app.id)}
                            aria-label={`Select ${applicantDisplayName(app) || app.id}`}
                            className="h-4 w-4 accent-[#062763]"
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold text-[#062763]">
                          {app.id}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {applicantDisplayName(app) || "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {recipient?.email ?? (
                            <span className="font-medium text-red-700">
                              No valid email
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {app.typeOfMobility || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {formatDate(app.submittedAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-[#062763]">Compose email</h2>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Each recipient receives an individual email. They will not see other
          recipients.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="applicant-mail-subject"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Subject
            </label>
            <input
              id="applicant-mail-subject"
              type="text"
              value={subject}
              disabled={!canSend || sending}
              onChange={(e) => {
                setSubject(e.target.value);
                setSendSuccess(null);
                setSendError(null);
              }}
              placeholder="Enter email subject"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="applicant-mail-message"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Message
            </label>
            <textarea
              id="applicant-mail-message"
              rows={10}
              value={message}
              disabled={!canSend || sending}
              onChange={(e) => {
                setMessage(e.target.value);
                setSendSuccess(null);
                setSendError(null);
              }}
              placeholder="Write the message applicants will receive"
              className={inputClass}
            />
          </div>
        </div>

        {sendError && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {sendError}
          </p>
        )}
        {sendSuccess && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            {sendSuccess}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
            className={`${actionBtnClass} border-[#062763] bg-[#062763] text-white hover:bg-[#062763]/90`}
          >
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </section>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-applicant-mail-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3
              id="confirm-applicant-mail-title"
              className="text-base font-bold text-[#062763]"
            >
              Send applicant email?
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-700">
              This will send &quot;{subject.trim()}&quot; to {recipientCount}{" "}
              recipient{recipientCount === 1 ? "" : "s"}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
                className={`${actionBtnClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend()}
                className={`${actionBtnClass} border-[#062763] bg-[#062763] text-white hover:bg-[#062763]/90`}
              >
                {sending ? "Sending…" : "Confirm send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
