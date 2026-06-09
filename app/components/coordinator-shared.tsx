import {
  applicantDisplayName,
  COORDINATOR_APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/application-types";
import {
  buildApplicantDetailSections,
  type ApplicantDetailRow,
} from "@/lib/application-applicant-details";
import { ApplicationDocumentPreview } from "./application-document-preview";
import { AssignEvaluatorSection } from "./assign-evaluator-section";

export function formatDisadvantaged(app: ApplicationRecord): string {
  const disadvantagedLabels: Record<string, string> = {
    disadvantagedFinancially: "Financially disadvantaged background",
    disadvantagedDisability: "Disability",
    disadvantagedRefugee: "Refugee/displaced person",
    disadvantagedConflict: "Conflict-affected region",
    disadvantagedMinority: "Minority/underrepresented community",
    disadvantagedOther: "Other",
  };
  const items = Object.entries(disadvantagedLabels)
    .filter(([key]) => app[key as keyof ApplicationRecord])
    .map(([, label]) => label);
  if (app.disadvantagedOther && app.disadvantagedOtherSpecify) {
    const i = items.indexOf("Other");
    if (i !== -1) items[i] = `Other: ${app.disadvantagedOtherSpecify}`;
  }
  return items.join("; ") || "—";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    draft: "bg-slate-200 text-slate-800",
    pending: "bg-amber-200 text-amber-950",
    under_review: "bg-sky-200 text-sky-950",
    evaluation: "bg-violet-200 text-violet-950",
    interview: "bg-indigo-200 text-indigo-950",
    final_evaluation: "bg-purple-200 text-purple-950",
    offered: "bg-emerald-200 text-emerald-950",
    reserved: "bg-orange-200 text-orange-950",
    approved: "bg-emerald-200 text-emerald-950",
    rejected: "bg-red-200 text-red-950",
    pre_departure: "bg-teal-200 text-teal-950",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function DetailRow({
  row,
  applicationId,
}: {
  row: ApplicantDetailRow;
  applicationId: string;
}) {
  const isMissing =
    row.isDocument &&
    (row.value === "Not uploaded" || row.value === "Not provided");

  const hasDocument =
    row.isDocument && !isMissing && row.documentField && row.value;

  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 sm:grid-cols-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-800">
        {row.label}
      </dt>
      <dd
        className={`text-sm font-semibold sm:col-span-2 ${
          row.isLongText ? "whitespace-pre-wrap leading-relaxed" : ""
        } ${isMissing ? "text-red-700" : "text-slate-950"}`}
      >
        {hasDocument ? (
          <ApplicationDocumentPreview
            applicationId={applicationId}
            field={row.documentField!}
            fileName={
              row.documentField === "profile" ? "profile.jpg" : row.value
            }
          />
        ) : (
          row.value || "—"
        )}
      </dd>
    </div>
  );
}

export function ApplicationDetailPanel({
  selected,
  updatingStatus = false,
  onStatusChange,
  showStatusUpdate = true,
  showAssignEvaluator = false,
  assigningEvaluatorSlot = null,
  onAssignEvaluator,
  collapsibleSections = false,
  embedded = false,
}: {
  selected: ApplicationRecord;
  updatingStatus?: boolean;
  onStatusChange?: (id: string, status: ApplicationStatus) => void;
  showStatusUpdate?: boolean;
  showAssignEvaluator?: boolean;
  assigningEvaluatorSlot?: 1 | 2 | null;
  onAssignEvaluator?: (
    id: string,
    slot: 1 | 2,
    evaluatorId: string | null
  ) => void | Promise<boolean>;
  /** Collapse each detail block (registration, documents, etc.) in an accordion. */
  collapsibleSections?: boolean;
  /** Inline accordion row (no max-height scroll container). */
  embedded?: boolean;
}) {
  const sections = buildApplicantDetailSections(selected, {
    profileUploaded: selected.profileUploaded,
  });

  return (
    <div
      className={
        embedded
          ? "p-4 sm:p-5"
          : "max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 sm:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#062763]">
            {applicantDisplayName(selected) || "—"}
          </h2>
          <p className="text-sm font-semibold text-slate-900">{selected.id}</p>
        </div>
        <StatusBadge status={selected.status} />
      </div>

      {showStatusUpdate && onStatusChange && (
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-800">
            Update status
          </label>
          <select
            value={selected.status}
            disabled={updatingStatus}
            onChange={(e) =>
              onStatusChange(selected.id, e.target.value as ApplicationStatus)
            }
            className="mt-1 w-full rounded-lg border-2 border-[#062763]/30 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
          >
            {COORDINATOR_APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      {showAssignEvaluator && onAssignEvaluator && (
        <AssignEvaluatorSection
          application={selected}
          assigningSlot={assigningEvaluatorSlot}
          onAssign={onAssignEvaluator}
        />
      )}

      <p className="mt-4 text-xs font-semibold text-slate-900">
        Submitted {formatDate(selected.submittedAt)} · Updated{" "}
        {formatDate(selected.updatedAt)}
        {selected.currentPage != null && (
          <> · Last form page: {selected.currentPage}</>
        )}
      </p>

      <div className={collapsibleSections ? "mt-6 space-y-2" : "mt-6 space-y-6"}>
        {sections.map((section, index) =>
          collapsibleSections ? (
            <details
              key={section.title}
              open={index === 0}
              className="group rounded-lg border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-extrabold text-[#062763] marker:content-none [&::-webkit-details-marker]:hidden">
                {section.title}
                <svg
                  className="h-4 w-4 shrink-0 text-[#062763] transition group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <dl className="border-t border-slate-100 bg-slate-50/50 px-3">
                {section.rows.map((row) => (
                  <DetailRow
                    key={`${section.title}-${row.label}`}
                    row={row}
                    applicationId={selected.id}
                  />
                ))}
              </dl>
            </details>
          ) : (
            <section key={section.title}>
              <h3 className="text-sm font-extrabold text-[#062763]">
                {section.title}
              </h3>
              <dl className="mt-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3">
                {section.rows.map((row) => (
                  <DetailRow
                    key={`${section.title}-${row.label}`}
                    row={row}
                    applicationId={selected.id}
                  />
                ))}
              </dl>
            </section>
          )
        )}
      </div>
    </div>
  );
}
