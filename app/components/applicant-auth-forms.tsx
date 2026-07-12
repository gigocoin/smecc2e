"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import {
  APPLICANT_FORGOT_PASSWORD_PATH,
  APPLICANT_LOGIN_PATH,
  applicantPasswordChangedLoginPath,
} from "@/lib/applicant-login-paths";

function ApplicantLoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const prefilledEmail = searchParams.get("email") ?? "";
  const verificationError = searchParams.get("error");
  const passwordChanged = searchParams.get("password_changed") === "1";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/applicant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
        mustChangePassword?: boolean;
      };

      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      const target =
        data.redirectTo ??
        (data.mustChangePassword
          ? "/applicant/change-password"
          : "/applicant/application?page=2");
      router.replace(target);
      router.refresh();
    } catch {
      setError("A network error occurred. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-[#062763]/10">
        <div className="border-b border-slate-100 bg-[#062763] px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2">
            <div className="relative h-full w-full">
              <Image
                src="/images/logo1.png"
                alt="SMECC2E"
                fill
                className="object-contain"
                sizes="64px"
                priority
              />
            </div>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">
            Applicant dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-200">
            Sign in to continue your scholarship application
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-8">
          {passwordChanged && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Your password has been updated. Sign in with your new password to
              continue your application.
            </div>
          )}

          {verificationError === "verification_failed" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              This verification link is invalid or has already been used. If you
              already verified your email, sign in with the temporary password
              from your inbox. Otherwise request a new link from the{" "}
              <Link href="/application?page=2" className="font-semibold underline">
                application form
              </Link>
              .
            </div>
          )}

          {verificationError === "expired" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              This verification link has expired (links are valid for 24 hours).
              Request a new one from the{" "}
              <Link href="/application?page=2" className="font-semibold underline">
                application form
              </Link>
              .
            </div>
          )}

          {verificationError === "missing_token" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Invalid verification link. Please use the link from your email or
              request a new one.
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="applicant-email"
              className="block text-xs font-bold text-slate-800"
            >
              Email address
            </label>
            <input
              id="applicant-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="applicant-password"
              className="block text-xs font-bold text-slate-800"
            >
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="applicant-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border-2 border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                placeholder="Temporary or new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-600 hover:bg-slate-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              First time? Use the temporary password from your verification email.
            </p>
            <p className="mt-2 text-right">
              <Link
                href={
                  email.trim()
                    ? `${APPLICANT_FORGOT_PASSWORD_PATH}?email=${encodeURIComponent(email.trim())}`
                    : APPLICANT_FORGOT_PASSWORD_PATH
                }
                className="text-xs font-semibold text-[#062763] hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#062763] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        Haven&apos;t started yet?{" "}
        <Link href="/application" className="font-semibold text-[#062763] hover:underline">
          Begin your application
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-slate-600">
        Staff or coordinator?{" "}
        <Link href="/login" className="font-semibold text-[#062763] hover:underline">
          Admin login
        </Link>
      </p>
    </div>
  );
}

export function ApplicantLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm font-medium text-slate-600">
          Loading…
        </div>
      }
    >
      <ApplicantLoginFormContent />
    </Suspense>
  );
}

function ApplicantChangePasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/applicant/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });
      const data = (await res.json()) as { error?: string; redirectTo?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      router.replace(
        data.redirectTo ??
          applicantPasswordChangedLoginPath(emailParam ?? "")
      );
      router.refresh();
    } catch {
      setError("Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-[#062763]/10">
        <div className="border-b border-slate-100 bg-[#062763] px-6 py-8 text-center text-white">
          <h1 className="text-xl font-bold tracking-tight">Set your password</h1>
          <p className="mt-2 text-sm text-slate-200">
            Replace your temporary password before continuing your application
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            For security, you must choose a new password before accessing your
            application.
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="new-password" className="block text-xs font-bold text-slate-800">
              New password
            </label>
            <div className="relative mt-1">
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border-2 border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm font-medium outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-slate-600"
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-800">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#062763] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a3580] disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ApplicantChangePasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm font-medium text-slate-600">
          Loading…
        </div>
      }
    >
      <ApplicantChangePasswordFormContent />
    </Suspense>
  );
}

function ApplicantForgotPasswordFormContent() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefilledEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDevLink(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/applicant/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        devLink?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not send reset instructions.");
        return;
      }

      setSuccess(
        data.message ??
          "If an account exists for that email, we sent password reset instructions."
      );
      if (data.devLink) setDevLink(data.devLink);
    } catch {
      setError("A network error occurred. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-[#062763]/10">
        <div className="border-b border-slate-100 bg-[#062763] px-6 py-8 text-center text-white">
          <h1 className="text-xl font-bold tracking-tight">Forgot password</h1>
          <p className="mt-2 text-sm text-slate-200">
            Enter your email and we&apos;ll send a link to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-8">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p>{success}</p>
              {devLink && (
                <p className="mt-2 break-all text-xs">
                  Development reset link:{" "}
                  <a href={devLink} className="font-semibold underline">
                    {devLink}
                  </a>
                </p>
              )}
            </div>
          )}

          {!success && (
            <>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-bold text-slate-800"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#062763] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remember your password?{" "}
        <Link
          href={APPLICANT_LOGIN_PATH}
          className="font-semibold text-[#062763] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ApplicantForgotPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm font-medium text-slate-600">
          Loading…
        </div>
      }
    >
      <ApplicantForgotPasswordFormContent />
    </Suspense>
  );
}

function ApplicantResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const expired = searchParams.get("error") === "expired";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid or expired reset link.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/applicant/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not reset password.");
        return;
      }
      router.replace(data.redirectTo ?? APPLICANT_LOGIN_PATH);
      router.refresh();
    } catch {
      setError("Could not reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        <p className="font-semibold">Invalid reset link</p>
        <p className="mt-2">
          Request a new password reset link from the{" "}
          <Link href={APPLICANT_FORGOT_PASSWORD_PATH} className="underline">
            forgot password
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-[#062763]/10">
        <div className="border-b border-slate-100 bg-[#062763] px-6 py-8 text-center text-white">
          <h1 className="text-xl font-bold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm text-slate-200">
            Enter a new password for your applicant dashboard account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-8">
          {expired && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              This reset link has expired. Request a new one from the{" "}
              <Link href={APPLICANT_FORGOT_PASSWORD_PATH} className="font-semibold underline">
                forgot password
              </Link>{" "}
              page.
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="reset-new-password" className="block text-xs font-bold text-slate-800">
              New password
            </label>
            <input
              id="reset-new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-bold text-slate-800"
            >
              Confirm new password
            </label>
            <input
              id="reset-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              disabled={loading}
              className="rounded border-slate-300"
            />
            Show passwords
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#062763] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a3580] disabled:opacity-50"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href={APPLICANT_LOGIN_PATH} className="font-semibold text-[#062763] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ApplicantResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm font-medium text-slate-600">
          Loading…
        </div>
      }
    >
      <ApplicantResetPasswordFormContent />
    </Suspense>
  );
}
