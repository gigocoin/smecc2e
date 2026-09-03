import type {
  CreateUserInput,
  DashboardUser,
  UpdateUserInput,
} from "./dashboard-users";
import { hashPassword, validatePassword } from "./password";
import { prisma } from "./prisma";
import {
  mapPrismaUser,
  parseUserRole,
  parseUserStatus,
} from "./prisma-mappers";

async function nextPublicId(): Promise<string> {
  const users = await prisma.user.findMany({
    select: { publicId: true },
    orderBy: { publicId: "desc" },
  });
  const nums = users
    .map((u) => u.publicId.match(/^USR-(\d+)$/i)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n!, 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `USR-${String(next).padStart(3, "0")}`;
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

function uniqueViolationMessage(err: unknown): string {
  const target = (
    err as { meta?: { target?: string | string[] } }
  ).meta?.target;
  const fields = Array.isArray(target)
    ? target
    : typeof target === "string"
      ? [target]
      : [];
  if (
    fields.some(
      (f) =>
        f.includes("institution") ||
        f.includes("focal") ||
        f === "users_institution_focal_person_unique"
    )
  ) {
    return "Only one focal person is allowed per institution.";
  }
  return "A user with this email already exists";
}

async function assertFocalPersonAvailable(
  institution: string,
  isFocalPerson: boolean,
  excludePublicId?: string
) {
  if (!isFocalPerson) return;
  const existing = await prisma.user.findFirst({
    where: {
      institution,
      isFocalPerson: true,
      ...(excludePublicId ? { publicId: { not: excludePublicId } } : {}),
    },
    select: { name: true, publicId: true },
  });
  if (existing) {
    throw new Error(
      `${existing.name} (${existing.publicId}) is already the focal person for this institution.`
    );
  }
}

export async function listUsers(): Promise<DashboardUser[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ publicId: "asc" }],
  });
  return users.map(mapPrismaUser);
}

export async function createUser(
  input: CreateUserInput
): Promise<{ user: DashboardUser; users: DashboardUser[] }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const address = (input.address ?? "").trim();
  const phoneNumber = input.phoneNumber.trim();
  const institution = input.institution.trim();
  const isFocalPerson = Boolean(input.isFocalPerson);

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!phoneNumber) throw new Error("Phone number is required");
  if (!institution) throw new Error("Institution is required");

  const passwordError = validatePassword(input.password);
  if (passwordError) throw new Error(passwordError);

  await assertFocalPersonAvailable(institution, isFocalPerson);

  const passwordHash = await hashPassword(input.password);

  try {
    const created = await prisma.user.create({
      data: {
        publicId: await nextPublicId(),
        name,
        email,
        address,
        phoneNumber,
        passwordHash,
        institution,
        isFocalPerson,
        profileImageUrl: input.profileImageUrl?.trim() || null,
        role: parseUserRole(input.role),
        status: parseUserStatus(input.status),
      },
    });
    const users = await listUsers();
    return { user: mapPrismaUser(created), users };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new Error(uniqueViolationMessage(err));
    }
    throw err;
  }
}

export async function updateUser(
  publicId: string,
  input: UpdateUserInput
): Promise<{ user: DashboardUser; users: DashboardUser[] }> {
  const existing = await prisma.user.findUnique({ where: { publicId } });
  if (!existing) throw new Error("User not found");

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const address = (input.address ?? "").trim();
  const phoneNumber = input.phoneNumber.trim();
  const institution = input.institution.trim();
  const isFocalPerson = Boolean(input.isFocalPerson);

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!phoneNumber) throw new Error("Phone number is required");
  if (!institution) throw new Error("Institution is required");

  await assertFocalPersonAvailable(institution, isFocalPerson, publicId);

  const password = input.password?.trim() ?? "";
  let passwordHash: string | undefined;
  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    passwordHash = await hashPassword(password);
  }

  try {
    const updated = await prisma.user.update({
      where: { publicId },
      data: {
        name,
        email,
        address,
        phoneNumber,
        institution,
        isFocalPerson,
        profileImageUrl: input.profileImageUrl?.trim() || null,
        role: parseUserRole(input.role),
        status: parseUserStatus(input.status),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    const users = await listUsers();
    return { user: mapPrismaUser(updated), users };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new Error(uniqueViolationMessage(err));
    }
    throw err;
  }
}

export async function deleteUser(
  publicId: string
): Promise<{ users: DashboardUser[] }> {
  const existing = await prisma.user.findUnique({ where: { publicId } });
  if (!existing) throw new Error("User not found");

  await prisma.user.delete({ where: { publicId } });
  const users = await listUsers();
  return { users };
}
