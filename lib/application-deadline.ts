/** Application closes at midnight (12:00 AM) on 17 July 2026, West Africa Time. */
export const APPLICATION_DEADLINE = new Date("2026-07-17T00:00:00+01:00");

export const APPLICATION_DEADLINE_CLOSED_MESSAGE =
  "The application deadline has passed. Draft applications can no longer be continued or submitted.";

export type ApplicationCountdown = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function getApplicationCountdown(
  now: Date = new Date(),
  deadline: Date = APPLICATION_DEADLINE
): ApplicationCountdown {
  const totalMs = Math.max(0, deadline.getTime() - now.getTime());
  const expired = totalMs <= 0;
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs, days, hours, minutes, seconds, expired };
}

export function isApplicationDeadlinePassed(
  now: Date = new Date(),
  deadline: Date = APPLICATION_DEADLINE
): boolean {
  return now.getTime() >= deadline.getTime();
}
