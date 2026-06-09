"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApplicantResetPasswordModal } from "./applicant-reset-password-modal";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/application-types";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { APPLICANT_LOGIN_PATH } from "@/lib/applicant-login-paths";

function statusTone(status: ApplicationStatus): string {
  if (status === "draft") return "bg-sky-100 text-sky-900";
  if (status === "pending" || status === "under_review") return "bg-sky-100 text-sky-900";
  if (status === "approved" || status === "offered") return "bg-emerald-100 text-emerald-900";
  if (status === "rejected") return "bg-red-100 text-red-900";
  return "bg-slate-100 text-slate-800";
}

export function ApplicantDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<ApplicantSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/applicant/me");
      const data = (await res.json()) as {
        user?: ApplicantSessionUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error ?? "Could not load your dashboard.");
        return;
      }
      if (data.user.mustChangePassword) {
        router.replace("/applicant/change-password");
        return;
      }
      setUser(data.user);
    } catch {
      setError("Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/applicant/logout", { method: "POST" });
      window.location.href = APPLICANT_LOGIN_PATH;
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-600">
        Loading your dashboard…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {error ?? "Could not load dashboard."}
      </div>
    );
  }

  const app = user.application;
  const displayName =
    app?.firstName || app?.surname
      ? `${app.firstName} ${app.surname}`.trim()
      : user.email;
  const isDraft = !app || app.status === "draft";
  const isSubmitted = app && app.status !== "draft";
  const continuePage = app?.currentPage && app.currentPage > 1 ? app.currentPage : 2;
  const continueHref = isDraft
    ? `/applicant/application?page=${continuePage}`
    : undefined;
  const statusLabel =
    app && (app.status === "pending" || app.status === "under_review")
      ? STATUS_LABELS.under_review
      : app
        ? (STATUS_LABELS[app.status] ?? app.status)
        : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#f7be2a]">
            Applicant portal
          </p>
          <h1 className="mt-1 text-xl font-bold text-white">
            Welcome{displayName !== user.email ? `, ${displayName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setResetPasswordOpen(true)}
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Reset password
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <ApplicantResetPasswordModal
        open={resetPasswordOpen}
        email={user.email}
        onClose={() => setResetPasswordOpen(false)}
      />

      <section className="rounded-2xl border border-white/10 bg-white p-6 shadow-lg">
        <h2 className="text-base font-bold text-[#062763]">Your application</h2>

        {!app ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-700">
              You have verified your email but have not saved application progress
              yet. Continue to complete your registration and application form.
            </p>
            <Link
              href="/applicant/application?page=2"
              className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a3580]"
            >
              Start application
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {app.publicId && (
                <span className="text-sm font-semibold text-slate-700">
                  Reference: <span className="text-[#062763]">{app.publicId}</span>
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(app.status)}`}
              >
                {statusLabel}
              </span>
            </div>

            {isDraft ? (
              <>
                <p className="text-sm text-slate-700">
                  Your application is saved as a draft
                  {app.currentPage
                    ? ` — last completed step ${app.currentPage} of 18`
                    : ""}
                  . Continue where you left off.
                </p>
                {continueHref && (
                  <Link
                    href={continueHref}
                    className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a3580]"
                  >
                    Continue application
                  </Link>
                )}
              </>
            ) : isSubmitted ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-4">
                <p className="text-sm font-semibold text-[#062763]">
                  Your Application has been received
                </p>
                {app.submittedAt && (
                  <p className="mt-2 text-sm text-slate-700">
                    Submitted on{" "}
                    {new Date(app.submittedAt).toLocaleDateString()}. You can sign
                    in here anytime to check status updates.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-700">
                You can sign in here anytime to check status updates.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">
        <p className="font-semibold text-white">Need help?</p>
        <p className="mt-1">
          If you did not receive your verification email or temporary password,
          return to the application form and request a new verification link.
        </p>
        <Link
          href="/application?page=2"
          className="mt-3 inline-block font-semibold text-[#f7be2a] hover:underline"
        >
          Request new verification email
        </Link>
      </section>
    </div>
  );
}
