/** Shown when Prisma cannot reach PostgreSQL (Neon down, network, paused DB, etc.). */
export const DATABASE_CONNECTION_MESSAGE =
  "Cannot connect to database now, please check your network and try again.";

const PRISMA_CONNECTION_CODES = new Set(["P1001", "P1002", "P1017"]);

export function isPrismaConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const prismaErr = err as { code?: string; message?: string; name?: string };
  if (prismaErr.code && PRISMA_CONNECTION_CODES.has(prismaErr.code)) {
    return true;
  }
  if (prismaErr.name === "PrismaClientInitializationError") {
    return true;
  }

  const message =
    typeof prismaErr.message === "string" ? prismaErr.message : String(err);

  return (
    /can't reach database server/i.test(message) ||
    /connection refused/i.test(message) ||
    /database server.*timed out/i.test(message) ||
    /ECONNREFUSED/i.test(message) ||
    /ETIMEDOUT/i.test(message) ||
    /ENOTFOUND/i.test(message)
  );
}

export function toUserFacingDatabaseError(err: unknown): string | null {
  return isPrismaConnectionError(err) ? DATABASE_CONNECTION_MESSAGE : null;
}

export function resolveApiError(err: unknown, fallback: string): string {
  return (
    toUserFacingDatabaseError(err) ??
    (err instanceof Error ? err.message : fallback)
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
      const canRetry =
        isPrismaConnectionError(err) && attempt < attempts - 1;
      if (!canRetry) throw err;
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}
