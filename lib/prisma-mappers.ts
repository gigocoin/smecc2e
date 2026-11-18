import type {
  Program,
  Region,
  University,
  User,
  UserRole,
  UserStatus,
} from "@prisma/client";
import type { ProgramRecord } from "./academic-program";
import { programTypeFromPrisma } from "./academic-program";
import type { DashboardUser } from "./dashboard-users";
import type { RegionRecord } from "./regions";
import type { UniversityRecord } from "./universities";

const userRoleLabels: Record<UserRole, DashboardUser["role"]> = {
  COORDINATOR: "Coordinator",
  EVALUATOR: "Evaluator",
  ADMINISTRATOR: "Administrator",
  SUPER_ADMIN: "Super Admin",
  FINANCE_COORDINATOR: "Finance Coordinator",
  FINANCE_OFFICER: "Finance Officer",
  FINANCE_AUDITOR: "Finance Auditor",
};

const userStatusLabels: Record<UserStatus, DashboardUser["status"]> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export function mapPrismaUser(user: User): DashboardUser {
  return {
    id: user.publicId,
    name: user.name,
    email: user.email,
    address: user.address ?? "",
    phoneNumber: user.phoneNumber,
    institution: user.institution,
    isFocalPerson: user.isFocalPerson ?? false,
    profileImageUrl: user.profileImageUrl ?? null,
    role: userRoleLabels[user.role],
    status: userStatusLabels[user.status],
  };
}

export function mapPrismaRegion(region: Region): RegionRecord {
  return {
    id: region.slug,
    name: region.name,
    countries: [...region.countries],
  };
}

export function mapPrismaUniversity(university: University): UniversityRecord {
  return {
    id: university.slug,
    dbId: university.id,
    name: university.name,
    thematicAreas: [...university.thematicAreas],
  };
}

export function mapPrismaProgram(
  program: Program,
  universityName: string
): ProgramRecord {
  return {
    id: program.id,
    universityId: program.universityId,
    universityName,
    country: program.country,
    type: programTypeFromPrisma(program.type),
    name: program.name,
    thematicArea: program.thematicArea,
    accreditationDetails: program.accreditationDetails,
    isActive: program.isActive ?? true,
  };
}

export function parseUserRole(
  role: DashboardUser["role"]
): UserRole {
  const map: Record<DashboardUser["role"], UserRole> = {
    Coordinator: "COORDINATOR",
    Evaluator: "EVALUATOR",
    Administrator: "ADMINISTRATOR",
    "Super Admin": "SUPER_ADMIN",
    "Finance Coordinator": "FINANCE_COORDINATOR",
    "Finance Officer": "FINANCE_OFFICER",
    "Finance Auditor": "FINANCE_AUDITOR",
  };
  return map[role];
}

export function parseUserStatus(
  status: DashboardUser["status"]
): UserStatus {
  const map: Record<DashboardUser["status"], UserStatus> = {
    Active: "ACTIVE",
    Inactive: "INACTIVE",
  };
  return map[status];
}
