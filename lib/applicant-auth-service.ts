import {
  authenticateApplicantAccount,
  findApplicantDraftIdByEmail,
  findApplicantSummaryByEmail,
  getApplicantAccount,
} from "./applicant-account-service";
import { isApplicationDeadlinePassed } from "./application-deadline";
import { applicantVerifiedLoginPath } from "./applicant-login-paths";
import {
  getApplicantSessionFromCookie,
  type ApplicantSessionClaims,
  verifyApplicantSessionToken,
} from "./applicant-session";
import type { ApplicationStatus } from "./application-types";

export class ApplicantAuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "ApplicantAuthError";
    this.status = status;
  }
}

export type ApplicantSessionUser = {
  email: string;
  applicantId: string | null;
  mustChangePassword: boolean;
  application: {
    id: string;
    publicId: string | null;
    status: ApplicationStatus;
    currentPage: number | null;
    firstName: string;
    surname: string;
    submittedAt: string | null;
    preferredHostInstitution: string;
    typeOfMobility: string;
    proposedAcademicProgramme: string;
    nationality: string;
    middleName: string;
    bachelorProgrammeUniversity: string;
    masterProgrammeUniversity: string;
    personalEmail: string;
    phoneNumber: string;
    homeAddress: string;
    passportOrIdNumber: string;
    nextOfKinName: string;
    nextOfKinWhatsapp: string;
    nextOfKinEmail: string;
    nextOfKinRelationship: string;
    gender: string;
    thematicArea: string;
  } | null;
};

export async function getApplicantSessionUser(): Promise<ApplicantSessionUser | null> {
  const session = await getApplicantSessionFromCookie();
  if (!session) return null;

  const account = await getApplicantAccount(session.email);
  if (!account) return null;

  const application = await findApplicantSummaryByEmail(session.email);

  return {
    email: session.email,
    applicantId: session.applicantId,
    mustChangePassword: account.mustChangePassword,
    application: application
      ? {
          id: application.id,
          publicId: application.publicId,
          status: application.status as ApplicationStatus,
          currentPage: application.currentPage,
          firstName: application.firstName,
          surname: application.surname,
          submittedAt: application.submittedAt?.toISOString() ?? null,
          preferredHostInstitution: application.preferredHostInstitution,
          typeOfMobility: application.typeOfMobility,
          proposedAcademicProgramme: application.proposedAcademicProgramme,
          nationality: application.nationality,
          middleName: application.middleName,
          bachelorProgrammeUniversity: application.bachelorProgrammeUniversity,
          masterProgrammeUniversity: application.masterProgrammeUniversity,
          personalEmail: application.personalEmail,
          phoneNumber: application.phoneNumber,
          homeAddress: application.homeAddress,
          passportOrIdNumber: application.passportOrIdNumber,
          nextOfKinName: application.nextOfKinName,
          nextOfKinWhatsapp: application.nextOfKinWhatsapp,
          nextOfKinEmail: application.nextOfKinEmail,
          nextOfKinRelationship: application.nextOfKinRelationship,
          gender: application.gender,
          thematicArea: application.thematicArea,
        }
      : null,
  };
}

export async function requireApplicantSessionUser(): Promise<ApplicantSessionUser> {
  const user = await getApplicantSessionUser();
  if (!user) throw new ApplicantAuthError();
  return user;
}

export async function requireApplicantPasswordChanged(): Promise<ApplicantSessionUser> {
  const user = await requireApplicantSessionUser();
  if (user.mustChangePassword) {
    throw new ApplicantAuthError("Password change required", 403);
  }
  return user;
}

export async function loginApplicant(
  email: string,
  password: string
): Promise<
  | {
      email: string;
      applicantId: string | null;
      mustChangePassword: boolean;
      currentPage: number | null;
      status: ApplicationStatus | null;
    }
  | { error: string }
> {
  const result = await authenticateApplicantAccount(email, password);
  if ("error" in result) return result;

  const applicantId = await findApplicantDraftIdByEmail(result.account.email);
  const application = await findApplicantSummaryByEmail(result.account.email);

  return {
    email: result.account.email,
    applicantId,
    mustChangePassword: result.account.mustChangePassword,
    currentPage: application?.currentPage ?? null,
    status: (application?.status as ApplicationStatus | undefined) ?? null,
  };
}

export { applicantVerifiedLoginPath } from "./applicant-login-paths";

export const APPLICANT_DASHBOARD_PATH = "/applicant";

export function applicantContinueApplicationPath(
  currentPage: number | null | undefined
): string {
  const page = currentPage && currentPage > 1 ? currentPage : 2;
  return `/applicant/application?page=${page}`;
}

/** Where applicants go after login / password change (form while open; dashboard when closed). */
export function applicantPostLoginPath(
  status?: ApplicationStatus | string | null,
  currentPage?: number | null
): string {
  if (isApplicationDeadlinePassed()) {
    return APPLICANT_DASHBOARD_PATH;
  }
  if (status && status !== "draft") {
    return APPLICANT_DASHBOARD_PATH;
  }
  return applicantContinueApplicationPath(currentPage);
}

export function safeApplicantApplicationRedirect(
  redirect: string | null | undefined,
  currentPage?: number | null,
  status?: ApplicationStatus | string | null
): string {
  if (isApplicationDeadlinePassed()) {
    return APPLICANT_DASHBOARD_PATH;
  }
  const fallback = applicantContinueApplicationPath(currentPage);
  if (!redirect) return fallback;
  if (
    redirect === "/applicant/application" ||
    redirect.startsWith("/applicant/application?")
  ) {
    return redirect;
  }
  if (
    redirect === APPLICANT_DASHBOARD_PATH ||
    redirect.startsWith("/applicant/")
  ) {
    return redirect;
  }
  return applicantPostLoginPath(status, currentPage);
}

export function applicantLoginRedirect(
  mustChangePassword: boolean,
  currentPage?: number | null,
  status?: ApplicationStatus | string | null
): string {
  const dest = applicantPostLoginPath(status, currentPage);
  if (mustChangePassword) {
    return `/applicant/change-password?redirect=${encodeURIComponent(dest)}`;
  }
  return dest;
}

export async function verifyApplicantSessionFromRequest(
  token: string | undefined
): Promise<ApplicantSessionClaims | null> {
  return verifyApplicantSessionToken(token);
}
