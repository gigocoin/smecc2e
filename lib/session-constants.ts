/** Coordinator / administrator dashboard — sign out after this much inactivity. */
export const SESSION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/** Applicant application form — sign out after this much inactivity. */
export const APPLICANT_SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

/** Throttle server session refresh while the user is active. */
export const SESSION_HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

/** Applicant heartbeat while filling the long application form. */
export const APPLICANT_SESSION_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
