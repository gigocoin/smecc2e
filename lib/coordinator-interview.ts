import type { ApplicationRecord } from "./application-types";

export function isApplicantAssignedForInterview(
  app: ApplicationRecord
): boolean {
  return Boolean(app.interviewerId);
}

export function isApplicantAssignedToInterviewer(
  app: ApplicationRecord,
  interviewerPublicId: string
): boolean {
  return Boolean(
    app.interviewerId && app.interviewerId === interviewerPublicId
  );
}

export function isApplicantInterviewed(app: ApplicationRecord): boolean {
  return app.interviewScore != null && Number.isFinite(app.interviewScore);
}
