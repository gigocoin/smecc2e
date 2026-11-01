import { Prisma, type Applicant, type Scholar, type User } from "@prisma/client";
import { mapPrismaApplicant, nomineeLetterHostUniversity } from "./application-mappers";
import type { ApplicationRecord } from "./application-types";
import { prisma } from "./prisma";

type StaffPick = Pick<User, "id" | "publicId" | "name" | "email">;

function sameInstitution(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function scholarHostInstitution(row: Scholar): string {
  return (
    nomineeLetterHostUniversity(row.nomineeLetterSharedData) ||
    row.preferredHostInstitution.trim()
  );
}

function toJsonInput(
  value: Prisma.JsonValue | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) return Prisma.JsonNull;
  return value;
}

/** Copy a nominee applicant row into the scholars table. */
export async function upsertScholarFromApplicant(applicant: Applicant): Promise<void> {
  const {
    id,
    createdAt,
    updatedAt,
    evaluator1EvaluationData,
    evaluator2EvaluationData,
    interviewEvaluationData,
    nomineeLetterSharedData,
    ...snapshot
  } = applicant;
  const migratedAt = new Date();
  const data = {
    ...snapshot,
    migratedAt,
    evaluator1EvaluationData: toJsonInput(evaluator1EvaluationData),
    evaluator2EvaluationData: toJsonInput(evaluator2EvaluationData),
    interviewEvaluationData: toJsonInput(interviewEvaluationData),
    nomineeLetterSharedData: toJsonInput(nomineeLetterSharedData),
  };
  await prisma.scholar.upsert({
    where: { applicantId: id },
    create: {
      applicantId: id,
      ...data,
    },
    update: data,
  });
}

export async function deleteScholarForApplicant(applicantId: string): Promise<void> {
  await prisma.scholar.deleteMany({ where: { applicantId } });
}

/** Scholars mirrored from nominees, in the same shape as an application record. */
export async function listScholars(options?: {
  /** Evaluator public id. When set, only scholars assigned to that evaluator are returned. */
  assignedToEvaluatorPublicId?: string;
  /** When set, only scholars hosted at this institution are returned. */
  hostInstitution?: string;
}): Promise<ApplicationRecord[]> {
  let assignedEvaluatorId: string | null = null;
  if (options?.assignedToEvaluatorPublicId) {
    const evaluator = await prisma.user.findUnique({
      where: { publicId: options.assignedToEvaluatorPublicId },
      select: { id: true },
    });
    if (!evaluator) return [];
    assignedEvaluatorId = evaluator.id;
  }

  const rows = await prisma.scholar.findMany({
    where: assignedEvaluatorId
      ? {
          OR: [
            { evaluator1Id: assignedEvaluatorId },
            { evaluator2Id: assignedEvaluatorId },
          ],
        }
      : undefined,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });

  const applicantIds = rows.map((row) => row.applicantId);
  const liveLetters =
    applicantIds.length === 0
      ? []
      : await prisma.applicant.findMany({
          where: { id: { in: applicantIds } },
          select: {
            id: true,
            nomineeLetterSharedData: true,
            nomineeLetterSharedAt: true,
            nomineeLetterSentAt: true,
          },
        });
  const letterByApplicantId = new Map(
    liveLetters.map((letter) => [letter.id, letter])
  );
  const rowsWithLetter = rows.map((row) => {
    const live = letterByApplicantId.get(row.applicantId);
    if (!live?.nomineeLetterSharedData) return row;
    return {
      ...row,
      nomineeLetterSharedData: live.nomineeLetterSharedData,
      nomineeLetterSharedAt: live.nomineeLetterSharedAt,
      nomineeLetterSentAt: live.nomineeLetterSentAt,
    };
  });

  const limitToHost = options?.hostInstitution !== undefined;
  const hostInstitution = options?.hostInstitution?.trim() ?? "";
  const visibleRows = limitToHost
    ? rowsWithLetter.filter((row) =>
        sameInstitution(scholarHostInstitution(row), hostInstitution)
      )
    : rowsWithLetter;

  const staffIds = [
    ...new Set(
      visibleRows.flatMap((row) =>
        [row.evaluator1Id, row.evaluator2Id, row.interviewerId].filter(
          (id): id is string => Boolean(id)
        )
      )
    ),
  ];
  const staff =
    staffIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, publicId: true, name: true, email: true },
        });
  const staffById = new Map<string, StaffPick>(
    staff.map((member) => [member.id, member])
  );

  return visibleRows.map((row) =>
    mapPrismaApplicant({
      ...row,
      evaluator1: row.evaluator1Id
        ? (staffById.get(row.evaluator1Id) ?? null)
        : null,
      evaluator2: row.evaluator2Id
        ? (staffById.get(row.evaluator2Id) ?? null)
        : null,
      interviewer: row.interviewerId
        ? (staffById.get(row.interviewerId) ?? null)
        : null,
    })
  );
}
