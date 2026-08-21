"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicationRecord } from "@/lib/application-types";
import { isApplicantInterviewed } from "@/lib/coordinator-interview";
import type { DashboardUser } from "@/lib/dashboard-users";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

const DEFAULT_INTERVIEWER_ROLES: DashboardUser["role"][] = [
  "Administrator",
];

export function AssignInterviewerControl({
  application,
  assigning,
  onAssign,
  allowedRoles = DEFAULT_INTERVIEWER_ROLES,
  showAssignedName = true,
}: {
  application: ApplicationRecord;
  assigning: boolean;
  onAssign: (
    applicationId: string,
    interviewerId: string | null
  ) => void | Promise<boolean>;
  /** Roles available in the assign interviewer menu. */
  allowedRoles?: DashboardUser["role"][];
  /** Show the currently assigned interviewer name above the action button. */
  showAssignedName?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const assignedId = application.interviewerId;
  const interviewed = isApplicantInterviewed(application);
  const actionLabel = interviewed
    ? "Interviewed"
    : assignedId
      ? "Reassign Interviewer"
      : "Assign Interviewer";

  const actionButtonClass = interviewed
    ? `${actionBtnClass} border-emerald-300 bg-emerald-50 text-emerald-900`
    : `${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`;

  const interviewers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === "Active" && allowedRoles.includes(user.role)
      ),
    [users, allowedRoles]
  );

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/users");
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load interviewers.");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setLoadError("Could not load interviewers.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedInterviewerId(assignedId ?? "");
    void loadUsers();
  }, [open, assignedId, loadUsers]);

  const closeModal = () => {
    if (assigning) return;
    setOpen(false);
    setLoadError(null);
  };

  const handleAssign = async () => {
    const result = await onAssign(
      application.id,
      selectedInterviewerId || null
    );
    if (result !== false) {
      setOpen(false);
      setLoadError(null);
    } else {
      setLoadError("Could not save interviewer assignment.");
    }
  };

  const emptyRolesLabel =
    allowedRoles.length === 1 && allowedRoles[0] === "Administrator"
      ? "No active administrators found."
      : "No active users found for interviewer assignment.";

  return (
    <>
      <div
        className={
          showAssignedName && assignedId
            ? "inline-flex flex-col items-end"
            : "contents"
        }
      >
        {showAssignedName && assignedId && (
          <p className="mb-1 text-xs font-semibold text-slate-700">
            {application.interviewerName ?? assignedId}
          </p>
        )}
        {interviewed ? (
          <span
            className={`inline-block whitespace-nowrap ${actionButtonClass}`}
            aria-label="Interview completed"
          >
            {actionLabel}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={assigning}
            className={`whitespace-nowrap ${actionButtonClass}`}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`assign-interviewer-${application.id}-title`}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`assign-interviewer-${application.id}-title`}
              className="text-base font-bold text-[#062763]"
            >
              {actionLabel}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Choose an interviewer for <strong>{application.id}</strong>.
            </p>

            <div className="mt-4">
              <label
                htmlFor={`interviewer-select-${application.id}`}
                className="block text-xs font-bold text-slate-800"
              >
                Interviewer
              </label>
              <select
                id={`interviewer-select-${application.id}`}
                value={selectedInterviewerId}
                disabled={loadingUsers || assigning}
                onChange={(e) => setSelectedInterviewerId(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {interviewers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.id}) — {user.role}
                  </option>
                ))}
              </select>
              {loadingUsers && (
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  Loading interviewers…
                </p>
              )}
              {!loadingUsers && interviewers.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  {emptyRolesLabel}
                </p>
              )}
              {loadError && (
                <p
                  className="mt-2 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {loadError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={assigning}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || loadingUsers}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {assigning ? "Saving…" : "Save assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
