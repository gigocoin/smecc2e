import { PrismaClient, ProgramType, UserRole, UserStatus } from "@prisma/client";
import { DEFAULT_SEED_USER_PASSWORD } from "../lib/dashboard-users";
import { hashPassword } from "../lib/password";
import {
  hostInstitutions,
  programmesByHostInstitution,
} from "../lib/programmes";
import { DEFAULT_REGION_OPTIONS, regionIdFromName } from "../lib/regions";
import { universitySlugFromName } from "../lib/universities";
import { SEED_UNIVERSITY_COUNTRIES } from "../lib/university-seed-countries";

const prisma = new PrismaClient();

const seedUsers = [
  {
    publicId: "USR-001",
    name: "Dr. Ngozi Eze",
    email: "smecc2e@unn.edu.ng",
    phoneNumber: "+234 803 000 0001",
    institution: "University of Nigeria (UNN)",
    role: UserRole.COORDINATOR,
    status: UserStatus.ACTIVE,
  },
  {
    publicId: "USR-002",
    name: "James Okonkwo",
    email: "j.okonkwo@unn.edu.ng",
    phoneNumber: "+234 803 000 0002",
    institution: "University of Nigeria (UNN)",
    role: UserRole.EVALUATOR,
    status: UserStatus.ACTIVE,
  },
  {
    publicId: "USR-003",
    name: "Amina Bello",
    email: "a.bello@unn.edu.ng",
    phoneNumber: "+250 788 000 003",
    institution: "University of Rwanda",
    role: UserRole.EVALUATOR,
    status: UserStatus.ACTIVE,
  },
  {
    publicId: "USR-004",
    name: "System Administrator",
    email: "admin@smecc2e.unn.edu.ng",
    phoneNumber: "+234 803 000 0004",
    institution: "SMECC2E Consortium",
    role: UserRole.ADMINISTRATOR,
    status: UserStatus.ACTIVE,
  },
] as const;

function inferProgramType(name: string): ProgramType {
  return /phd|doctorate/i.test(name) ? ProgramType.DOCTORATE : ProgramType.MASTER;
}

async function main() {
  const passwordHash = await hashPassword(DEFAULT_SEED_USER_PASSWORD);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        phoneNumber: user.phoneNumber,
        institution: user.institution,
        role: user.role,
        status: user.status,
        publicId: user.publicId,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  for (const name of DEFAULT_REGION_OPTIONS) {
    const slug = regionIdFromName(name);
    await prisma.region.upsert({
      where: { slug },
      update: { name },
      create: {
        slug,
        name,
        countries: [],
      },
    });
  }

  for (const name of hostInstitutions) {
    const slug = universitySlugFromName(name);
    const country = SEED_UNIVERSITY_COUNTRIES[name] ?? "Unknown";
    const university = await prisma.university.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });

    const programmeNames = programmesByHostInstitution[name] ?? [];
    for (const programmeName of programmeNames) {
      await prisma.program.upsert({
        where: {
          universityId_name_type: {
            universityId: university.id,
            name: programmeName,
            type: inferProgramType(programmeName),
          },
        },
        update: {
          country,
          type: inferProgramType(programmeName),
          thematicArea: "Sustainable Energy",
          accreditationDetails: "Accredited programme (seed data)",
        },
        create: {
          universityId: university.id,
          country,
          type: inferProgramType(programmeName),
          name: programmeName,
          thematicArea: "Sustainable Energy",
          accreditationDetails: "Accredited programme (seed data)",
        },
      });
    }
  }

  console.log("Seeded users, regions, universities, and programs.");
  console.log(
    `Default seed user password: ${DEFAULT_SEED_USER_PASSWORD} (change after first login)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
