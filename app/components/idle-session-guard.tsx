"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  SESSION_HEARTBEAT_INTERVAL_MS,
  SESSION_IDLE_TIMEOUT_MS,
} from "@/lib/session-constants";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

async function signOutIdle() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort cookie clear before redirect.
  }
  window.location.href = "/login?reason=idle";
}

export function IdleSessionGuard() {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatRef = useRef(0);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      void signOutIdle();
    }, SESSION_IDLE_TIMEOUT_MS);
  }, []);

  const maybeHeartbeat = useCallback(() => {
    const now = Date.now();
    if (now - lastHeartbeatRef.current < SESSION_HEARTBEAT_INTERVAL_MS) {
      return;
    }
    lastHeartbeatRef.current = now;
    fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => undefined);
  }, []);

  const onActivity = useCallback(() => {
    resetIdleTimer();
    maybeHeartbeat();
  }, [resetIdleTimer, maybeHeartbeat]);

  const checkSessionOnVisible = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 503 || res.status >= 500) {
        // Connection/server issues are shown by AppErrorProvider; keep session.
        resetIdleTimer();
        return;
      }
      if (!res.ok) {
        await signOutIdle();
        return;
      }
      resetIdleTimer();
    } catch {
      // Network failures are shown by AppErrorProvider; keep session.
      resetIdleTimer();
    }
  }, [resetIdleTimer]);

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
