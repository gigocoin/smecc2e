import type { DashboardUser } from "./dashboard-users";

export type UserMailSendMode = "all" | "single" | "selected";

export type UserMailRecipient = {
  userId: string;
  name: string;
  email: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function userMailRecipient(
  user: DashboardUser
): UserMailRecipient | null {
  const email = user.email.trim();
  if (!email || !isValidEmail(email)) return null;
  const name = user.name.trim() || "Team Member";
  return {
    userId: user.id,
    name,
    email: normalizeEmail(email),
  };
}

export function userRecipientsFromUsers(
  users: DashboardUser[]
): UserMailRecipient[] {
  const seen = new Set<string>();
  const recipients: UserMailRecipient[] = [];

  for (const user of users) {
    const recipient = userMailRecipient(user);
    if (!recipient || seen.has(recipient.email)) continue;
    seen.add(recipient.email);
    recipients.push(recipient);
  }

  return recipients.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}
