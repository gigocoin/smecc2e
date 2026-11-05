"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
} from "@/lib/application-types";
import { downloadScholarshipAgreementPdf } from "@/lib/scholarship-acceptance-download";
import { scholarshipAgreementCohortLabel } from "@/lib/scholarship-agreement-shared";
import { formatDate, StatusBadge } from "./coordinator-shared";
import { ScholarshipAgreementDocument } from "./scholarship-agreement-document";

function scholarHost(app: ApplicationRecord): string {
  return app.nomineeHostUniversity || app.preferredHostInstitution || "";
}

function scholarMobility(app: ApplicationRecord): string {
  return app.nomineeMobilityType || app.typeOfMobility || "";
}

function ViewIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

async function waitForDocumentImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  );
}

export function CoordinatorScholarshipAgreement({
  scholars,
  loading,
  onRejected,
}: {
  scholars: ApplicationRecord[];
  loading: boolean;
  onRejected: () => void;
}) {
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ApplicationRecord | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pendingPdfId, setPendingPdfId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const submitted = useMemo(
    () =>
      scholars.filter(
        (app) =>
          app.scholarshipAgreementSubmitted && app.scholarshipAgreementData
      ),
    [scholars]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submitted;
    return submitted.filter((app) => {
      const haystack = [
        app.id,
        applicantDisplayName(app),
        applicantPrimaryEmail(app),
        scholarHost(app),
        scholarMobility(app),
        app.scholarshipAgreementData?.cohort,
        app.scholarshipAgreementData?.signature,
        app.scholarshipAgreementData?.agreementVersion,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [submitted, search]);

  useEffect(() => {
    if (!pendingPdfId || !viewing || viewing.id !== pendingPdfId) return;
    let cancelled = false;
    void (async () => {
      try {
        const root =
          documentRef.current?.querySelector<HTMLElement>(
            "[data-scholarship-agreement-document]"
          ) ?? null;
        if (!root) {
          throw new Error("Could not find the agreement form to export.");
        }
        await waitForDocumentImages(root);
        if (cancelled) return;
        await downloadScholarshipAgreementPdf(root, viewing.id);
      } catch (err) {
        if (!cancelled) {
          setActionError(
            err instanceof Error
              ? err.message
              : "Could not download the agreement form PDF."
          );
        }
      } finally {
        if (!cancelled) {
          setPendingPdfId(null);
          setDownloading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingPdfId, viewing]);

  const downloadFormPdf = (app: ApplicationRecord) => {
    if (downloading) return;
    setActionError(null);
    setDownloading(true);
    setViewing(app);
    setPendingPdfId(app.id);
  };

  const rejectScholar = async (app: ApplicationRecord) => {
    const name = applicantDisplayName(app) || app.id;
    if (
      !window.confirm(
        `Reject ${name}? This removes the scholar record and sets the application status to rejected.`
      )
    ) {
      return;
    }
    setActionError(null);
    setRejectingId(app.id);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not reject this scholar.");
        return;
      }
      if (viewing?.id === app.id) setViewing(null);
      onRejected();
    } catch {
      setActionError("Could not reject this scholar.");
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
        <div className="min-w-48 flex-1">
          <label className="block text-xs font-bold text-slate-800">Search</label>
          <input
            type="search"
            placeholder="Name, email, ID, institution…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
          />
        </div>
      </div>

      {actionError && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className="min-w-max rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-[#062763]">
            Signed agreements ({filtered.length})
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            Scholars who have completed the scholarship agreement / e-signature
            form.
          </p>
        </div>
        <div>
          <table className="w-max min-w-full text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Scholar</th>
                <th className="px-4 py-3">Mobility / Host</th>
                <th className="px-4 py-3">Cohort</th>
                <th className="px-4 py-3">Signed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    {loading
                      ? "Loading scholars…"
                      : "No scholarship agreements have been signed yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const form = app.scholarshipAgreementData!;
                  return (
                    <tr key={app.id} className="hover:bg-[#062763]/5">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {applicantDisplayName(app) || "—"}
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          {app.id}
                        </p>
                        <p className="text-xs font-semibold text-slate-900">
                          {applicantPrimaryEmail(app)}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <p>{scholarMobility(app) || "—"}</p>
                        <p className="text-xs font-semibold text-slate-800">
                          {scholarHost(app) || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {scholarshipAgreementCohortLabel(form.cohort)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {form.signedAt ||
                          formatDate(app.scholarshipAgreementSubmittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewing(app)}
                            title="View agreement"
                            aria-label={`View scholarship agreement for ${applicantDisplayName(app) || app.id}`}
                            className="inline-flex rounded-lg border-2 border-[#062763]/25 p-1.5 text-[#062763] transition hover:bg-[#062763]/5"
                          >
                            <ViewIcon />
                          </button>
                          <button
                            type="button"
                            disabled={rejectingId === app.id}
                            onClick={() => void rejectScholar(app)}
                            className="rounded-lg border-2 border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {rejectingId === app.id ? "Rejecting…" : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing?.scholarshipAgreementData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agreement-form-title"
          onClick={() => setViewing(null)}
        >
          <div
            className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div>
                <h3
                  id="agreement-form-title"
                  className="text-base font-bold text-[#062763]"
                >
                  Scholarship agreement / e-signature
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {applicantDisplayName(viewing)} · {viewing.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div
              ref={documentRef}
              className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
            >
              <ScholarshipAgreementDocument
                app={viewing}
                form={viewing.scholarshipAgreementData}
              />
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => void downloadFormPdf(viewing)}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
              >
                <DownloadIcon />
                {downloading ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button
                type="button"
                disabled={rejectingId === viewing.id}
                onClick={() => void rejectScholar(viewing)}
                className="rounded-lg border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
              >
                {rejectingId === viewing.id ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
