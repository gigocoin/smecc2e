/** Shown when Prisma cannot reach PostgreSQL (Neon down, network, paused DB, etc.). */
export const DATABASE_CONNECTION_MESSAGE =
  "Cannot connect to the database right now. Please check your network and try again.";

export const NETWORK_ERROR_MESSAGE =
  "A network error occurred. Check your connection and try again.";

const PRISMA_CONNECTION_CODES = new Set([
  "P1001",
  "P1002",
  "P1017",
  "P2024",
]);

function errorMessageOf(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(err);
}

export function isPrismaConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return isTechnicalDatabaseMessage(errorMessageOf(err));
  }

  const prismaErr = err as { code?: string; message?: string; name?: string };
  if (prismaErr.code && PRISMA_CONNECTION_CODES.has(prismaErr.code)) {
    return true;
  }
  if (prismaErr.name === "PrismaClientInitializationError") {
    return true;
  }
  if (
    (prismaErr.name === "PrismaClientKnownRequestError" ||
      prismaErr.name === "PrismaClientUnknownRequestError") &&
    isTechnicalDatabaseMessage(errorMessageOf(err))
  ) {
    return true;
  }

  return isTechnicalDatabaseMessage(errorMessageOf(err));
}

export function isTechnicalDatabaseMessage(message: string): boolean {
  if (!message.trim()) return false;
  return (
    /can't reach database server/i.test(message) ||
    /connection refused/i.test(message) ||
    /database server.*timed out/i.test(message) ||
    /timed out fetching a new connection/i.test(message) ||
    /connection pool/i.test(message) ||
    /connection reset/i.test(message) ||
    /server has closed the connection/i.test(message) ||
    /ECONNREFUSED/i.test(message) ||
    /ETIMEDOUT/i.test(message) ||
    /ENOTFOUND/i.test(message) ||
    /ECONNRESET/i.test(message) ||
    /__TURBOPACK__/i.test(message) ||
    /Invalid\s+`/.test(message) ||
    /prisma\.(user|applicant|\$queryRaw)/i.test(message) ||
    /Timed out fetching a new connection from the connection pool/i.test(
      message
    )
  );
}

export function isNetworkLikeError(err: unknown): boolean {
  if (isPrismaConnectionError(err)) return true;
  const message = errorMessageOf(err);
  return (
    /failed to fetch/i.test(message) ||
    /networkerror/i.test(message) ||
    /load failed/i.test(message) ||
    /network request failed/i.test(message)
  );
}

export function toUserFacingDatabaseError(err: unknown): string | null {
  return isPrismaConnectionError(err) ? DATABASE_CONNECTION_MESSAGE : null;
}

/** Never leak Prisma / Turbopack internals to the UI. */
export function sanitizeUserFacingError(
  message: string | null | undefined,
  fallback = NETWORK_ERROR_MESSAGE
): string {
  const text = (message ?? "").trim();
  if (!text) return fallback;
  if (text === DATABASE_CONNECTION_MESSAGE || text === NETWORK_ERROR_MESSAGE) {
    return text;
  }
  if (isTechnicalDatabaseMessage(text)) {
    return DATABASE_CONNECTION_MESSAGE;
  }
  if (
    /failed to fetch/i.test(text) ||
    /networkerror/i.test(text) ||
    /load failed/i.test(text)
  ) {
    return NETWORK_ERROR_MESSAGE;
  }
  return text;
}

export function resolveApiError(err: unknown, fallback: string): string {
  return (
    toUserFacingDatabaseError(err) ??
    sanitizeUserFacingError(
      err instanceof Error ? err.message : null,
      fallback
    )
  );
}

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry Prisma calls when Neon or the network drops idle connections. */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number }
): Promise<T> {
  const attempts = options?.attempts ?? DEFAULT_RETRY_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const canRetry = isPrismaConnectionError(err) && attempt < attempts - 1;
      if (!canRetry) throw err;
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}
