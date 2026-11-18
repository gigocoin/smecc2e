"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { defaultDashboardPathForRole } from "@/lib/dashboard-portal";
import type { DashboardUserRole } from "@/lib/dashboard-users";
import { APPLICANT_LOGIN_PATH } from "@/lib/applicant-login-paths";
import {
  DATABASE_CONNECTION_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  sanitizeUserFacingError,
} from "@/lib/prisma-errors";
import { useAppError } from "./app-error-provider";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const idleLogout = searchParams.get("reason") === "idle";
  const { showError, showNetworkError } = useAppError();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLogin = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          redirect: redirect ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
        user?: { role: DashboardUserRole };
      };

      if (!res.ok) {
        const friendly = sanitizeUserFacingError(
          data.error,
          "Login failed. Please try again."
        );
        if (
          res.status === 503 ||
          friendly === DATABASE_CONNECTION_MESSAGE ||
          friendly === NETWORK_ERROR_MESSAGE
        ) {
          showError(friendly, {
            title: "Connection problem",
            onRetry: () => {
              void submitLogin();
            },
          });
          return;
        }
        setError(friendly);
        return;
      }

      const fallback = data.user?.role
        ? defaultDashboardPathForRole(data.user.role)
        : "/login";
      router.replace(data.redirectTo ?? fallback);
      router.refresh();
    } catch {
      showNetworkError({
        onRetry: () => {
          void submitLogin();
        },
      });
    } finally {
      setLoading(false);
    }
  }, [email, password, redirect, router, showError, showNetworkError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin();
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
            Sign in to access your dashboard
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-8">
          {idleLogout && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
            >
              You were signed out after 10 minutes of inactivity. Please sign in
              again.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            >
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold text-slate-700"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
              placeholder="you@institution.edu.ng"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold text-slate-700"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:text-[#062763]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#f7be2a] py-3 text-sm font-extrabold uppercase tracking-[0.15em] text-[#062763] transition hover:bg-[#062763] hover:text-white focus:outline-none focus:ring-4 focus:ring-[#f7be2a]/40 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-xs text-slate-600">
          <Link
            href="/"
            className="font-semibold text-[#062763] hover:underline"
          >
            ← Back to public site
          </Link>
          <span className="mx-2 text-slate-300">·</span>
          <Link
            href={APPLICANT_LOGIN_PATH}
            className="font-semibold text-[#062763] hover:underline"
          >
            Applicant login
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-600 shadow-lg">
          Loading…
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
