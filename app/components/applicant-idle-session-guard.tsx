"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  SESSION_HEARTBEAT_INTERVAL_MS,
  SESSION_IDLE_TIMEOUT_MS,
} from "@/lib/session-constants";
import { applicantVerifiedLoginPath } from "@/lib/applicant-login-paths";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

async function signOutIdle(email?: string) {
  try {
    await fetch("/api/auth/applicant/logout", { method: "POST" });
  } catch {
    // Best-effort cookie clear before redirect.
  }
  const loginPath = email
    ? `${applicantVerifiedLoginPath(email)}&reason=idle`
    : "/applicant/login?reason=idle";
  window.location.href = loginPath;
}

export function ApplicantIdleSessionGuard({ email }: { email?: string }) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatRef = useRef(0);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      void signOutIdle(email);
    }, SESSION_IDLE_TIMEOUT_MS);
  }, [email]);

  const maybeHeartbeat = useCallback(() => {
    const now = Date.now();
    if (now - lastHeartbeatRef.current < SESSION_HEARTBEAT_INTERVAL_MS) {
      return;
    }
    lastHeartbeatRef.current = now;
    fetch("/api/auth/applicant/heartbeat", { method: "POST" }).catch(
      () => undefined
    );
  }, []);

  const onActivity = useCallback(() => {
    resetIdleTimer();
    maybeHeartbeat();
  }, [resetIdleTimer, maybeHeartbeat]);

  const checkSessionOnVisible = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/auth/applicant/me", { cache: "no-store" });
      if (!res.ok) {
        await signOutIdle(email);
        return;
      }
      resetIdleTimer();
    } catch {
      resetIdleTimer();
    }
  }, [email, resetIdleTimer]);

  useEffect(() => {
    resetIdleTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", checkSessionOnVisible);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", checkSessionOnVisible);
    };
  }, [onActivity, resetIdleTimer, checkSessionOnVisible]);

  return null;
}
