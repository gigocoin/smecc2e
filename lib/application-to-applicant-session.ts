import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import {
  applicantDisplayName,
  applicantPrimaryEmail,
  type ApplicationRecord,
} from "@/lib/application-types";

export function applicationRecordToApplicantSession(
  app: ApplicationRecord
): { user: ApplicantSessionUser; displayName: string } {
  const email = applicantPrimaryEmail(app);
  const displayName = applicantDisplayName(app) || email || app.id;

  const user: ApplicantSessionUser = {
    email,
    applicantId: app.id,
    mustChangePassword: false,
    application: {
      id: app.id,
      publicId: app.id,
      status: app.status,
      currentPage: app.currentPage ?? null,
      firstName: app.firstName,
      surname: app.surname,
      submittedAt: app.submittedAt ?? null,
      preferredHostInstitution:
        app.nomineeHostUniversity || app.preferredHostInstitution || "",
      typeOfMobility: app.nomineeMobilityType || app.typeOfMobility || "",
      proposedAcademicProgramme:
        app.nomineeAreaOfStudy || app.proposedAcademicProgramme || "",
      nationality: app.nationality || "",
      middleName: app.middleName || "",
      bachelorProgrammeUniversity: app.bachelorProgrammeUniversity || "",
      masterProgrammeUniversity: app.masterProgrammeUniversity || "",
      personalEmail: app.personalEmail || email,
      phoneNumber: app.phoneNumber || "",
      homeAddress: app.homeAddress || "",
      passportOrIdNumber: app.passportOrIdNumber || "",
      nextOfKinName: app.nextOfKinName || "",
      nextOfKinWhatsapp: app.nextOfKinWhatsapp || "",
      nextOfKinEmail: app.nextOfKinEmail || "",
      nextOfKinRelationship: app.nextOfKinRelationship || "",
      gender: app.gender || "",
      thematicArea: app.thematicArea || "",
    },
  };

  return { user, displayName };
}
