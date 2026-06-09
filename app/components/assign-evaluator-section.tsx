"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicationRecord, EvaluatorReviewStatus } from "@/lib/application-types";
import type { DashboardUser } from "@/lib/dashboard-users";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

type EvaluatorSlot = 1 | 2;

function evaluatorFields(application: ApplicationRecord, slot: EvaluatorSlot) {
  if (slot === 1) {
    return {
      id: application.evaluator1Id,
      name: application.evaluator1Name,
      email: application.evaluator1Email,
    };
  }
  return {
    id: application.evaluator2Id,
    name: application.evaluator2Name,
    email: application.evaluator2Email,
  };
}

function evaluatorReviewStatus(
  application: ApplicationRecord,
  slot: EvaluatorSlot
): EvaluatorReviewStatus {
  return slot === 1
    ? (application.evaluator1ReviewStatus ?? "pending")
    : (application.evaluator2ReviewStatus ?? "pending");
}

function slotActionLabel(
  application: ApplicationRecord,
  slot: EvaluatorSlot
): string {
  const assigned = evaluatorFields(application, slot);
  if (!assigned.id) return `Assign Evaluator ${slot}`;
  if (evaluatorReviewStatus(application, slot) === "rejected") {
    return `Reassign Evaluator ${slot}`;
  }
  return "Assigned";
}

function slotActionButtonClass(
  application: ApplicationRecord,
  slot: EvaluatorSlot
): string {
  const assigned = evaluatorFields(application, slot);
  if (!assigned.id) {
    return `${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`;
  }
  if (evaluatorReviewStatus(application, slot) === "rejected") {
    return `${actionBtnClass} border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100`;
  }
  return `${actionBtnClass} border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`;
}

function reviewStatusLabel(status: EvaluatorReviewStatus): string {
  switch (status) {
    case "accepted":
      return "Accepted by evaluator";
    case "rejected":
      return "Rejected by evaluator";
    case "evaluated":
      return "Evaluation completed";
    default:
      return "Awaiting evaluator review";
  }
}

function AssignEvaluatorSlot({
  application,
  slot,
  label,
  assigning,
  onAssign,
}: {
  application: ApplicationRecord;
  slot: EvaluatorSlot;
  label: string;
  assigning: boolean;
  onAssign: (
    applicationId: string,
    slot: EvaluatorSlot,
    evaluatorId: string | null
  ) => void | Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [evaluators, setEvaluators] = useState<DashboardUser[]>([]);
  const [loadingEvaluators, setLoadingEvaluators] = useState(false);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const assigned = evaluatorFields(application, slot);
  const otherSlotEvaluatorId =
    slot === 1 ? application.evaluator2Id : application.evaluator1Id;
  const reviewStatus = evaluatorReviewStatus(application, slot);
  const actionLabel = slotActionLabel(application, slot);

  const activeEvaluators = useMemo(
    () =>
      evaluators.filter(
        (user) => user.role === "Evaluator" && user.status === "Active"
      ),
    [evaluators]
  );

  const selectableEvaluators = useMemo(
    () =>
      activeEvaluators.filter(
        (user) =>
          !otherSlotEvaluatorId || user.id !== otherSlotEvaluatorId
      ),
    [activeEvaluators, otherSlotEvaluatorId]
  );

  const loadEvaluators = useCallback(async () => {
    setLoadingEvaluators(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/users");
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load evaluators.");
        return;
      }
      setEvaluators(data.users ?? []);
    } catch {
      setLoadError("Could not load evaluators.");
    } finally {
      setLoadingEvaluators(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedEvaluatorId(assigned.id ?? "");
    void loadEvaluators();
  }, [open, assigned.id, loadEvaluators]);

  const closeModal = () => {
    if (assigning) return;
    setOpen(false);
    setLoadError(null);
  };

  const handleAssign = async () => {
    if (
      selectedEvaluatorId &&
      otherSlotEvaluatorId &&
      selectedEvaluatorId === otherSlotEvaluatorId
    ) {
      setLoadError("This evaluator is already assigned to the other slot.");
      return;
    }

    const result = await onAssign(
      application.id,
      slot,
      selectedEvaluatorId || null
    );
    if (result !== false) {
      setOpen(false);
      setLoadError(null);
    } else {
      setLoadError(
        "Could not save assignment. This evaluator may already be assigned."
      );
    }
  };

  const modalTitleId = `assign-evaluator-${slot}-title`;
  const selectId = `evaluator-${slot}-select`;

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
          assigned.id
            ? reviewStatus === "rejected"
              ? "border-amber-200 bg-amber-50/60"
              : "border-emerald-200 bg-emerald-50/60"
            : "border-slate-200 bg-white"
        }`}
      >
        <div>
          <p className="text-xs font-bold text-slate-800">{label}</p>
          {assigned.id ? (
            <>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {assigned.name ?? assigned.id}
                {assigned.email && (
                  <span className="block text-xs font-semibold text-slate-700">
                    {assigned.email}
                  </span>
                )}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  reviewStatus === "rejected"
                    ? "text-amber-900"
                    : reviewStatus === "evaluated"
                      ? "text-emerald-800"
                      : "text-slate-700"
                }`}
              >
                {reviewStatusLabel(reviewStatus)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-600">
              No evaluator assigned
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={assigning}
          className={slotActionButtonClass(application, slot)}
        >
          {actionLabel}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={modalTitleId}
              className="text-base font-bold text-[#062763]"
            >
              {actionLabel}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Choose {label.toLowerCase()} for{" "}
              <strong>{application.id}</strong>. Each evaluator can only be
              assigned once per applicant.
            </p>

            <div className="mt-4">
              <label
                htmlFor={selectId}
                className="block text-xs font-bold text-slate-800"
              >
                Evaluator
              </label>
              <select
                id={selectId}
                value={selectedEvaluatorId}
                disabled={loadingEvaluators || assigning}
                onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {selectableEvaluators.map((evaluator) => (
                  <option key={evaluator.id} value={evaluator.id}>
                    {evaluator.name} ({evaluator.id})
                  </option>
                ))}
              </select>
              {loadingEvaluators && (
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  Loading evaluators…
                </p>
              )}
              {!loadingEvaluators && selectableEvaluators.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  {activeEvaluators.length === 0
                    ? "No active evaluators found. Create one in Users first."
                    : "No other evaluators available. The other slot already uses the remaining evaluators."}
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
                disabled={assigning || loadingEvaluators}
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

export function AssignEvaluatorSection({
  application,
  assigningSlot,
  onAssign,
}: {
  application: ApplicationRecord;
  assigningSlot: EvaluatorSlot | null;
  onAssign: (
    applicationId: string,
    slot: EvaluatorSlot,
    evaluatorId: string | null
  ) => void | Promise<boolean>;
}) {
  return (
    <div className="mt-4 space-y-2">
      <AssignEvaluatorSlot
        application={application}
        slot={1}
        label="Evaluator 1"
        assigning={assigningSlot === 1}
        onAssign={onAssign}
      />
      <AssignEvaluatorSlot
        application={application}
        slot={2}
        label="Evaluator 2"
        assigning={assigningSlot === 2}
        onAssign={onAssign}
      />
    </div>
  );
}
