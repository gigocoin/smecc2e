"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardUser } from "@/lib/dashboard-users";
import {
  userMailRecipient,
  type UserMailSendMode,
} from "@/lib/communication-user-mail-shared";

type RecipientMode = UserMailSendMode;

const modeOptions: { id: RecipientMode; label: string; description: string }[] =
  [
    {
      id: "all",
      label: "All users",
      description:
        "Send to every team member with a valid email, including inactive accounts",
    },
    {
      id: "single",
      label: "One user",
      description: "Choose a single team member from the list",
    },
    {
      id: "selected",
      label: "Selected users",
      description: "Tick multiple team members to include in this send",
    },
  ];

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const actionBtnClass =
  "rounded-lg border-2 px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

function UserStatusBadge({ status }: { status: DashboardUser["status"] }) {
  const active = status === "Active";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
        active
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

export function CommunicationUserMailsSection({
  canSend,
}: {
  canSend: boolean;
}) {
  const [users, setUsers] = useState<DashboardUser[]>([]);
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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/users");
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setLoadError("Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const haystack = [
        user.id,
        user.name,
        user.email,
        user.role,
        user.institution,
        user.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search]);

  const mailableUsers = useMemo(
    () => users.filter((user) => userMailRecipient(user) != null),
    [users]
  );

  const recipientCount = useMemo(() => {
    if (mode === "all") return mailableUsers.length;
    return selectedIds.filter((id) =>
      mailableUsers.some((user) => user.id === id)
    ).length;
  }, [mode, mailableUsers, selectedIds]);

  const toggleSelection = (userId: string) => {
    setSendSuccess(null);
    setSendError(null);

    if (mode === "single") {
      setSelectedIds([userId]);
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllVisible = () => {
    const visibleMailable = filteredUsers
      .filter((user) => userMailRecipient(user) != null)
      .map((user) => user.id);
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
      const res = await fetch("/api/communication/mails/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          subject,
          message,
          userIds: mode === "all" ? undefined : selectedIds,
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
          Only coordinators and administrators can send team member emails.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold text-[#062763]">Recipients</h2>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Choose which team members should receive this email.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
            {mode === "all"
              ? ` · ${mailableUsers.length} users with email`
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

        {mode !== "all" && (
          <div className="mt-4">
            <label
              htmlFor="user-mail-search"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Find users
            </label>
            <input
              id="user-mail-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, user ID, role, institution, or status"
              className={inputClass}
            />
          </div>
        )}
      </section>

      {mode !== "all" && (
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
                  <th className="px-3 py-2">User ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm font-medium text-slate-600"
                    >
                      Loading users…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm font-medium text-slate-600"
                    >
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const recipient = userMailRecipient(user);
                    const selected = selectedIds.includes(user.id);
                    const disabled = !canSend || recipient == null;

                    return (
                      <tr
                        key={user.id}
                        className={`border-t border-slate-100 ${
                          selected ? "bg-[#062763]/5" : "bg-white"
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type={mode === "single" ? "radio" : "checkbox"}
                            name="user-mail-recipient"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleSelection(user.id)}
                            aria-label={`Select ${user.name || user.id}`}
                            className="h-4 w-4 accent-[#062763]"
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold text-[#062763]">
                          {user.id}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {user.name || "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {recipient?.email ?? (
                            <span className="font-medium text-red-700">
                              No valid email
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{user.role}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {user.institution || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <UserStatusBadge status={user.status} />
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
          Each team member receives an individual email. They will not see other
          recipients.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="user-mail-subject"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Subject
            </label>
            <input
              id="user-mail-subject"
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
              htmlFor="user-mail-message"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Message
            </label>
            <textarea
              id="user-mail-message"
              rows={10}
              value={message}
              disabled={!canSend || sending}
              onChange={(e) => {
                setMessage(e.target.value);
                setSendSuccess(null);
                setSendError(null);
              }}
              placeholder="Write the message team members will receive"
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
          aria-labelledby="confirm-user-mail-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3
              id="confirm-user-mail-title"
              className="text-base font-bold text-[#062763]"
            >
              Send team email?
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
