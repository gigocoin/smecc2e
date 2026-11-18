"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DATABASE_CONNECTION_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  isTechnicalDatabaseMessage,
  sanitizeUserFacingError,
} from "@/lib/prisma-errors";
import { NetworkErrorModal } from "./network-error-modal";

type AppErrorOptions = {
  title?: string;
  onRetry?: () => void;
};

type AppErrorContextValue = {
  showError: (message: string, options?: AppErrorOptions) => void;
  showNetworkError: (options?: AppErrorOptions) => void;
  clearError: () => void;
};

const AppErrorContext = createContext<AppErrorContextValue | null>(null);

const SKIP_AUTO_MODAL_PATHS = [
  "/api/auth/heartbeat",
  "/api/auth/applicant/heartbeat",
  "/api/auth/logout",
];

function shouldSkipAutoModal(input: RequestInfo | URL): boolean {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const path = new URL(raw, window.location.origin).pathname;
    return SKIP_AUTO_MODAL_PATHS.some(
      (skip) => path === skip || path.startsWith(`${skip}/`)
    );
  } catch {
    return false;
  }
}

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const data = (await res.clone().json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Non-JSON bodies are fine; fall through.
  }
  return null;
}

export function AppErrorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Connection problem");
  const [message, setMessage] = useState(DATABASE_CONNECTION_MESSAGE);
  const retryRef = useRef<(() => void) | undefined>(undefined);
  const lastShownRef = useRef<{ message: string; at: number } | null>(null);

  const clearError = useCallback(() => {
    setOpen(false);
    retryRef.current = undefined;
  }, []);

  const showError = useCallback(
    (rawMessage: string, options?: AppErrorOptions) => {
      const nextMessage = sanitizeUserFacingError(rawMessage);
      const now = Date.now();
      const last = lastShownRef.current;
      if (
        last &&
        last.message === nextMessage &&
        now - last.at < 4000 &&
        open
      ) {
        return;
      }
      lastShownRef.current = { message: nextMessage, at: now };
      setTitle(options?.title ?? "Connection problem");
      setMessage(nextMessage);
      retryRef.current = options?.onRetry;
      setOpen(true);
    },
    [open]
  );

  const showNetworkError = useCallback(
    (options?: AppErrorOptions) => {
      showError(NETWORK_ERROR_MESSAGE, {
        title: options?.title ?? "Network error",
        onRetry: options?.onRetry,
      });
    },
    [showError]
  );

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      try {
        const res = await originalFetch(input, init);
        if (shouldSkipAutoModal(input)) return res;

        if (res.status === 503 || res.status >= 500) {
          const raw = await readErrorMessage(res);
          if (
            res.status === 503 ||
            (raw && isTechnicalDatabaseMessage(raw)) ||
            raw === DATABASE_CONNECTION_MESSAGE
          ) {
            showError(
              sanitizeUserFacingError(raw, DATABASE_CONNECTION_MESSAGE),
              { title: "Connection problem" }
            );
          }
        }
        return res;
      } catch (err) {
        if (!shouldSkipAutoModal(input)) {
          showNetworkError();
        }
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [showError, showNetworkError]);

  const value = useMemo(
    () => ({
      showError,
      showNetworkError,
      clearError,
    }),
    [showError, showNetworkError, clearError]
  );

  return (
    <AppErrorContext.Provider value={value}>
      {children}
      <NetworkErrorModal
        open={open}
        title={title}
        message={message}
        onClose={clearError}
        onRetry={
          retryRef.current
            ? () => {
                const retry = retryRef.current;
                clearError();
                retry?.();
              }
            : undefined
        }
      />
    </AppErrorContext.Provider>
  );
}

export function useAppError(): AppErrorContextValue {
  const ctx = useContext(AppErrorContext);
  if (!ctx) {
    throw new Error("useAppError must be used within AppErrorProvider");
  }
  return ctx;
}
