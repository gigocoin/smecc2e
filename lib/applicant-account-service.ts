import { randomBytes } from "crypto";
import { normalizeEmail } from "./email-verification-store";
import { hashPassword, validatePassword, verifyPassword } from "./password";
import { withPrismaRetry } from "./prisma-errors";
import { prisma } from "./prisma";

export type ApplicantAccountRecord = {
  email: string;
  mustChangePassword: boolean;
  verifiedAt: Date;
};

function generateTempPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i]! % chars.length];
  }
  return password;
}

export async function provisionApplicantCredentials(
  email: string
): Promise<{ tempPassword: string | null }> {
  const normalized = normalizeEmail(email);
  const existing = await withPrismaRetry(() =>
    prisma.applicantAccount.findUnique({
      where: { email: normalized },
    })
  );

  if (existing && !existing.mustChangePassword) {
    return { tempPassword: null };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await withPrismaRetry(() =>
    prisma.applicantAccount.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        passwordHash,
        mustChangePassword: true,
      },
      update: {
        passwordHash,
        mustChangePassword: true,
      },
    })
  );

  return { tempPassword };
}

export async function getApplicantAccount(
  email: string
): Promise<ApplicantAccountRecord | null> {
  const normalized = normalizeEmail(email);
  const row = await prisma.applicantAccount.findUnique({
    where: { email: normalized },
  });
  if (!row) return null;
  return {
    email: row.email,
    mustChangePassword: row.mustChangePassword,
    verifiedAt: row.verifiedAt,
  };
}

export async function authenticateApplicantAccount(
  email: string,
  password: string
): Promise<{ account: ApplicantAccountRecord } | { error: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) {
    return { error: "Email and password are required." };
  }

  const row = await prisma.applicantAccount.findUnique({
    where: { email: normalized },
  });
  if (!row) {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  return {
    account: {
      email: row.email,
      mustChangePassword: row.mustChangePassword,
      verifiedAt: row.verifiedAt,
    },
  };
}

export async function changeApplicantPassword(
  email: string,
  newPassword: string,
  options?: { currentPassword?: string }
): Promise<void> {
  const normalized = normalizeEmail(email);
  const row = await prisma.applicantAccount.findUnique({
    where: { email: normalized },
  });
  if (!row) throw new Error("Account not found");

  if (row.mustChangePassword) {
    const passwordError = validatePassword(newPassword);
    if (passwordError) throw new Error(passwordError);
  } else {
    const currentPassword = options?.currentPassword?.trim() ?? "";
    if (!currentPassword) throw new Error("Current password is required.");
    const valid = await verifyPassword(currentPassword, row.passwordHash);
    if (!valid) throw new Error("Current password is incorrect.");
    const passwordError = validatePassword(newPassword);
    if (passwordError) throw new Error(passwordError);
  }

  await prisma.applicantAccount.update({
    where: { email: normalized },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
    },
  });
}

export async function resetApplicantPassword(
  email: string,
  newPassword: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  const row = await prisma.applicantAccount.findUnique({
    where: { email: normalized },
  });
  if (!row) throw new Error("Account not found");

  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);

  await prisma.applicantAccount.update({
    where: { email: normalized },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
    },
  });
}

export async function findApplicantDraftIdByEmail(
  email: string
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const row = await prisma.applicant.findFirst({
    where: {
      status: "draft",
      OR: [
        { email: { equals: normalized, mode: "insensitive" } },
        { personalEmail: { equals: normalized, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function findApplicantSummaryByEmail(email: string): Promise<{
  id: string;
  publicId: string | null;
  status: string;
  currentPage: number | null;
  firstName: string;
  surname: string;
  submittedAt: Date | null;
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
} | null> {
  const normalized = normalizeEmail(email);
  const row = await prisma.applicant.findFirst({
    where: {
      OR: [
        { email: { equals: normalized, mode: "insensitive" } },
        { personalEmail: { equals: normalized, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      publicId: true,
      status: true,
      currentPage: true,
      firstName: true,
      surname: true,
      submittedAt: true,
      preferredHostInstitution: true,
      typeOfMobility: true,
      proposedAcademicProgramme: true,
      nationality: true,
      middleName: true,
      bachelorProgrammeUniversity: true,
      masterProgrammeUniversity: true,
      personalEmail: true,
      phoneNumber: true,
      homeAddress: true,
      passportOrIdNumber: true,
      nextOfKinName: true,
      nextOfKinWhatsapp: true,
      nextOfKinEmail: true,
      nextOfKinRelationship: true,
      gender: true,
      thematicArea: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.publicId,
    status: row.status,
    currentPage: row.currentPage,
    firstName: row.firstName,
    surname: row.surname,
    submittedAt: row.submittedAt,
    preferredHostInstitution: row.preferredHostInstitution,
    typeOfMobility: row.typeOfMobility,
    proposedAcademicProgramme: row.proposedAcademicProgramme,
    nationality: row.nationality,
    middleName: row.middleName,
    bachelorProgrammeUniversity: row.bachelorProgrammeUniversity,
    masterProgrammeUniversity: row.masterProgrammeUniversity,
    personalEmail: row.personalEmail,
    phoneNumber: row.phoneNumber,
    homeAddress: row.homeAddress,
    passportOrIdNumber: row.passportOrIdNumber,
    nextOfKinName: row.nextOfKinName,
    nextOfKinWhatsapp: row.nextOfKinWhatsapp,
    nextOfKinEmail: row.nextOfKinEmail,
    nextOfKinRelationship: row.nextOfKinRelationship,
    gender: row.gender,
    thematicArea: row.thematicArea,
  };
}
