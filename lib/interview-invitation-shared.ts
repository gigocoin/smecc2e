export type InterviewInvitationDetails = {
  date: string;
  time: string;
  venue: string;
};

export function formatInterviewInvitationDate(dateValue: string): string {
  const trimmed = dateValue.trim();
  if (!trimmed) return "";
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatInterviewInvitationTime(timeValue: string): string {
  const trimmed = timeValue.trim();
  if (!trimmed) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return trimmed.includes("GMT") ? trimmed : `${trimmed} GMT`;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
    return trimmed.includes("GMT") ? trimmed : `${trimmed} GMT`;
  }
  const hh = String(hours).padStart(2, "0");
  return `${hh}:${minutes} GMT`;
}

export function buildInterviewInvitationMessage(
  details: InterviewInvitationDetails,
  administratorEmail?: string | null
): string {
  const dateLabel =
    formatInterviewInvitationDate(details.date) || "[Insert date]";
  const timeLabel =
    formatInterviewInvitationTime(details.time) || "[Insert time]";
  const venueLabel = details.venue.trim() || "[Insert details]";
  const adminEmail =
    administratorEmail?.trim() || "[administrator email]";

  return [
    "Dear Applicant,",
    "",
    "You are hereby invited to attend an interview for the SMECC2E Scholarship Programme.",
    "",
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Venue/Online link: ${venueLabel}`,
    "",
    "Please join the interview at least 10 minutes early and have a valid means of identification and relevant supporting documents available.",
    "",
    `Kindly confirm your availability upon receiving this message by sending a message to ${adminEmail}`,
    "",
    "Best regards,",
    "SMECC2E Scholarship Selection Committee",
  ].join("\n");
}

export function validateInterviewInvitationDetails(
  details: InterviewInvitationDetails
): InterviewInvitationDetails {
  const date = details.date.trim();
  const time = details.time.trim();
  const venue = details.venue.trim();

  if (!date) throw new Error("Interview date is required");
  if (!time) throw new Error("Interview time is required");
  if (!venue) throw new Error("Venue / online link is required");

  return { date, time, venue };
}
