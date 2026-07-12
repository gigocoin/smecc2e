import type {
  ApplicationPayload,
  ApplicationRecord,
  ApplicationStatus,
  EvaluatorReviewAction,
  EvaluatorReviewStatus,
} from "./application-types";
import {
  applicantEmailFromPayload,
  mapPrismaApplicant,
  payloadToApplicantFields,
} from "./application-mappers";
import {
  applicationDocumentStorageRefs,
  deleteAllApplicationDocumentsForRefs,
  migrateApplicationDocumentStorage,
} from "./application-document-storage";
import { validateApplicationForSubmit } from "./application-validation";
import { isApplicantEmailVerifiedForSubmit } from "./email-verification-store";
import {
  getActiveEvaluationRubric,
  rubricCriterionIds,
} from "./evaluation-rubric-service";
import {
  ASSESSOR_SCORE_MAX,
  computeCategoryTotal,
} from "./evaluator-evaluation-rubric";
import type { EvaluatorEvaluationSubmission } from "./evaluator-evaluation-types";
import { parseEvaluatorEvaluationSubmission } from "./evaluator-evaluation-types";
import type { DashboardUser } from "./dashboard-users";
import { getActiveInterviewCriteria } from "./interview-rubric-service";
import type { InterviewEvaluationSubmission, InterviewScoreSummary } from "./interview-scoring-sheet";
import {
  computeTotalInterviewScore,
  interviewScoreMaximum,
} from "./interview-scoring-sheet";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export class DuplicateApplicationError extends Error {
  field: "email" | "nin";

  constructor(field: "email" | "nin") {
    super(
      field === "email"
        ? "An application has already been submitted with this email address."
        : "An application has already been submitted with this passport or national ID number."
    );
    this.name = "DuplicateApplicationError";
    this.field = field;
  }
}

function applicantWhereByRef(ref: string) {
  return {
    OR: [{ publicId: ref }, { id: ref }],
  };
}

async function nextApplicationPublicId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;
  const rows = await prisma.applicant.findMany({
    where: { publicId: { startsWith: prefix } },
    select: { publicId: true },
    orderBy: { publicId: "desc" },
    take: 100,
  });

  let max = 0;
  for (const row of rows) {
    if (!row.publicId) continue;
    const match = row.publicId.match(/^APP-\d{4}-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function findDraftRowByEmail(
  email: string
): Promise<Awaited<ReturnType<typeof prisma.applicant.findFirst>>> {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;

  return prisma.applicant.findFirst({
    where: {
      status: "draft",
      OR: [
        { email: { equals: norm, mode: "insensitive" } },
        { personalEmail: { equals: norm, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function findDraftByEmail(
  email: string
): Promise<ApplicationRecord | null> {
  const row = await findDraftRowByEmail(email);
  return row ? mapPrismaApplicant(row) : null;
}

async function assertNoDuplicateSubmittedApplication(
  email: string,
  passportOrIdNumber: string,
  excludeApplicantId?: string
): Promise<void> {
  const normEmail = email.trim().toLowerCase();
  const normNin = passportOrIdNumber.trim();
  const excludeId = excludeApplicantId?.trim();

  const submittedOnly = {
    status: { not: "draft" as const },
    ...(excludeId ? { NOT: { id: excludeId } } : {}),
  };

  if (normEmail) {
    const byEmail = await prisma.applicant.findFirst({
      where: {
        ...submittedOnly,
        OR: [
          { email: { equals: normEmail, mode: "insensitive" } },
          { personalEmail: { equals: normEmail, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (byEmail) {
      throw new DuplicateApplicationError("email");
    }
  }

  if (normNin) {
    const byNin = await prisma.applicant.findFirst({
      where: {
        ...submittedOnly,
        passportOrIdNumber: { equals: normNin, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (byNin) {
      throw new DuplicateApplicationError("nin");
    }
  }
}

function applicantIncludeEvaluators() {
  const evaluatorSelect = {
    select: { id: true, publicId: true, name: true, email: true },
  } as const;
  return {
    evaluator1: evaluatorSelect,
    evaluator2: evaluatorSelect,
    interviewer: evaluatorSelect,
  } as const;
}

function myEvaluatorReviewStatusForRow(
  row: {
    evaluator1Id: string | null;
    evaluator2Id: string | null;
    evaluator1ReviewStatus: EvaluatorReviewStatus;
    evaluator2ReviewStatus: EvaluatorReviewStatus;
  },
  evaluatorInternalId: string
): EvaluatorReviewStatus | null {
  if (row.evaluator1Id === evaluatorInternalId) {
    return row.evaluator1ReviewStatus;
  }
  if (row.evaluator2Id === evaluatorInternalId) {
    return row.evaluator2ReviewStatus;
  }
  return null;
}

function myEvaluatorEvaluationDataForRow(
  row: {
    evaluator1Id: string | null;
    evaluator2Id: string | null;
    evaluator1EvaluationData: unknown;
    evaluator2EvaluationData: unknown;
  },
  evaluatorInternalId: string
): EvaluatorEvaluationSubmission | null {
  if (row.evaluator1Id === evaluatorInternalId) {
    return parseEvaluatorEvaluationSubmission(row.evaluator1EvaluationData);
  }
  if (row.evaluator2Id === evaluatorInternalId) {
    return parseEvaluatorEvaluationSubmission(row.evaluator2EvaluationData);
  }
  return null;
}

function enrichApplicationForEvaluator(
  application: ApplicationRecord,
  row: {
    evaluator1Id: string | null;
    evaluator2Id: string | null;
    evaluator1ReviewStatus: EvaluatorReviewStatus;
    evaluator2ReviewStatus: EvaluatorReviewStatus;
    evaluator1EvaluationData: unknown;
    evaluator2EvaluationData: unknown;
  },
  evaluatorInternalId: string
): ApplicationRecord {
  return {
    ...application,
    myEvaluatorReviewStatus: myEvaluatorReviewStatusForRow(
      row,
      evaluatorInternalId
    ),
    myEvaluatorEvaluationData: myEvaluatorEvaluationDataForRow(
      row,
      evaluatorInternalId
    ),
  };
}

async function resolveUserInternalId(
  userPublicId: string
): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { publicId: userPublicId },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function isApplicationAssignedToEvaluator(
  applicationRef: string,
  evaluatorPublicId: string
): Promise<boolean> {
  const evaluatorId = await resolveUserInternalId(evaluatorPublicId);
  if (!evaluatorId) return false;

  const row = await prisma.applicant.findFirst({
    where: {
      ...applicantWhereByRef(applicationRef),
      OR: [{ evaluator1Id: evaluatorId }, { evaluator2Id: evaluatorId }],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listApplications(options?: {
  includeDrafts?: boolean;
  /** When set, only applications assigned to this evaluator (public id) are returned. */
  assignedToEvaluatorPublicId?: string;
  /** Evaluator interview queue: assigned as interviewer with completed scorecards. */
  interviewQueueForPublicId?: string;
}): Promise<ApplicationRecord[]> {
  const includeDrafts = options?.includeDrafts ?? false;
  const interviewUserInternalId = options?.interviewQueueForPublicId
    ? await resolveUserInternalId(options.interviewQueueForPublicId)
    : null;

  if (options?.interviewQueueForPublicId && !interviewUserInternalId) {
    return [];
  }

  let assignedFilter:
    | { OR: Array<{ evaluator1Id: string } | { evaluator2Id: string }> }
    | { interviewerId: string; OR: Array<{ evaluator1ReviewStatus: "evaluated" } | { evaluator2ReviewStatus: "evaluated" }> }
    | undefined;

  if (interviewUserInternalId) {
    assignedFilter = {
      interviewerId: interviewUserInternalId,
      OR: [
        { evaluator1ReviewStatus: "evaluated" },
        { evaluator2ReviewStatus: "evaluated" },
      ],
    };
  } else if (options?.assignedToEvaluatorPublicId) {
    const evaluatorId = await resolveUserInternalId(
      options.assignedToEvaluatorPublicId
    );
    if (!evaluatorId) return [];
    assignedFilter = {
      OR: [{ evaluator1Id: evaluatorId }, { evaluator2Id: evaluatorId }],
    };
  }

  const rows = await prisma.applicant.findMany({
    where: {
      ...(includeDrafts ? {} : { status: { not: "draft" } }),
      ...(assignedFilter ?? {}),
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    include: applicantIncludeEvaluators(),
  });

  const evaluatorInternalId =
    interviewUserInternalId ??
    (options?.assignedToEvaluatorPublicId
      ? await resolveUserInternalId(options.assignedToEvaluatorPublicId)
      : null);

  return rows.map((row) => {
    const application = mapPrismaApplicant(row);
    if (!evaluatorInternalId) return application;
    return enrichApplicationForEvaluator(application, row, evaluatorInternalId);
  });
}

export async function getApplication(
  id: string
): Promise<ApplicationRecord | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
    include: applicantIncludeEvaluators(),
  });
  return row ? mapPrismaApplicant(row) : null;
}

export async function getApplicationDocumentStorageRefs(
  id: string
): Promise<string[] | null> {
  const row = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
    select: { id: true, publicId: true },
  });
  if (!row) return null;
  return applicationDocumentStorageRefs(row.publicId, row.id);
}

export async function upsertDraftApplication(
  payload: ApplicationPayload,
  currentPage: number
): Promise<ApplicationRecord> {
  const email = applicantEmailFromPayload(payload);
  if (!email) {
    throw new Error("Email is required to save application progress");
  }

  const fields = payloadToApplicantFields(payload);
  const existing = await findDraftRowByEmail(email);
  const now = new Date();

  if (existing) {
    await assertNoDuplicateSubmittedApplication(
      email,
      payload.passportOrIdNumber,
      existing.id
    );
    let publicId = existing.publicId;
    if (!publicId) {
      publicId = await nextApplicationPublicId();
      await migrateApplicationDocumentStorage(existing.id, publicId);
    }
    const updated = await prisma.applicant.update({
      where: { id: existing.id },
      data: {
        ...fields,
        publicId,
        status: "draft",
        currentPage,
        updatedAt: now,
      },
    });
    return mapPrismaApplicant(updated);
  }

  await assertNoDuplicateSubmittedApplication(
    email,
    payload.passportOrIdNumber
  );

  const publicId = await nextApplicationPublicId();
  const created = await prisma.applicant.create({
    data: {
      ...fields,
      publicId,
      status: "draft",
      currentPage,
      submittedAt: now,
    },
  });
  return mapPrismaApplicant(created);
}

export async function submitApplication(
  payload: ApplicationPayload,
  existingId?: string
): Promise<ApplicationRecord> {
  const email = applicantEmailFromPayload(payload);
  if (!email) {
    throw new Error("Email is required to submit your application.");
  }
  if (!(await isApplicantEmailVerifiedForSubmit(payload))) {
    throw new Error("Please verify your email before submitting.");
  }

  const validation = validateApplicationForSubmit(payload, {
    instructionsAccepted: true,
    emailVerified: true,
  });
  if (!validation.valid) {
    const preview = validation.errors.slice(0, 8).join("; ");
    const suffix =
      validation.errors.length > 8
        ? ` (+${validation.errors.length - 8} more)`
        : "";
    throw new Error(
      `Please complete all required fields before submitting: ${preview}${suffix}`
    );
  }

  const fields = payloadToApplicantFields(payload);
  const now = new Date();

  let existing = existingId
    ? await prisma.applicant.findFirst({ where: applicantWhereByRef(existingId) })
    : null;

  if (!existing && email) {
    existing = await findDraftRowByEmail(email);
  }

  if (existing && existing.status !== "draft") {
    throw new DuplicateApplicationError("email");
  }

  await assertNoDuplicateSubmittedApplication(
    email,
    payload.passportOrIdNumber,
    existing?.id
  );

  if (existing?.status === "draft") {
    const hadPublicId = Boolean(existing.publicId);
    const publicId = existing.publicId ?? (await nextApplicationPublicId());
    if (!hadPublicId) {
      await migrateApplicationDocumentStorage(existing.id, publicId);
    }
    const updated = await prisma.applicant.update({
      where: { id: existing.id },
      data: {
        ...fields,
        publicId,
        status: "under_review",
        currentPage: null,
        submittedAt: now,
        updatedAt: now,
      },
    });
    return mapPrismaApplicant(updated);
  }

  const publicId = await nextApplicationPublicId();
  const created = await prisma.applicant.create({
    data: {
      ...fields,
      publicId,
      status: "under_review",
      submittedAt: now,
      currentPage: null,
    },
  });
  return mapPrismaApplicant(created);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<ApplicationRecord | null> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  if (!existing) return null;

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: { status, updatedAt: new Date() },
    include: applicantIncludeEvaluators(),
  });
  return mapPrismaApplicant(updated);
}

export async function assignApplicationEvaluator(
  id: string,
  slot: 1 | 2,
  evaluatorRef: string | null
): Promise<ApplicationRecord | null> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  if (!existing) return null;

  let evaluatorId: string | null = null;
  if (evaluatorRef) {
    const evaluator = await prisma.user.findFirst({
      where: {
        OR: [{ id: evaluatorRef }, { publicId: evaluatorRef }],
        role: "EVALUATOR",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!evaluator) {
      throw new Error("Invalid or inactive evaluator");
    }
    evaluatorId = evaluator.id;

    const otherSlotEvaluatorId =
      slot === 1 ? existing.evaluator2Id : existing.evaluator1Id;
    if (otherSlotEvaluatorId && otherSlotEvaluatorId === evaluatorId) {
      throw new Error(
        "This evaluator is already assigned to this applicant"
      );
    }
  }

  const data =
    slot === 1
      ? {
          evaluator1Id: evaluatorId,
          evaluator1ReviewStatus: "pending" as const,
          updatedAt: new Date(),
        }
      : {
          evaluator2Id: evaluatorId,
          evaluator2ReviewStatus: "pending" as const,
          updatedAt: new Date(),
        };

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data,
    include: applicantIncludeEvaluators(),
  });
  return mapPrismaApplicant(updated);
}

export async function assignApplicationInterviewer(
  id: string,
  interviewerRef: string | null
): Promise<ApplicationRecord | null> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  if (!existing) return null;

  let interviewerId: string | null = null;
  if (interviewerRef) {
    const interviewer = await prisma.user.findFirst({
      where: {
        OR: [{ id: interviewerRef }, { publicId: interviewerRef }],
        role: { in: ["EVALUATOR", "COORDINATOR", "ADMINISTRATOR"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!interviewer) {
      throw new Error("Invalid or inactive interviewer");
    }
    interviewerId = interviewer.id;
  }

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      interviewerId,
      updatedAt: new Date(),
    },
    include: applicantIncludeEvaluators(),
  });
  return mapPrismaApplicant(updated);
}

export async function isApplicationAssignedToInterviewer(
  applicationRef: string,
  interviewerPublicId: string
): Promise<boolean> {
  const interviewerId = await resolveUserInternalId(interviewerPublicId);
  if (!interviewerId) return false;

  const row = await prisma.applicant.findFirst({
    where: {
      ...applicantWhereByRef(applicationRef),
      interviewerId,
    },
    select: { id: true },
  });
  return Boolean(row);
}

const INTERVIEW_SCORE_MIN = 0;

export async function submitInterviewScore(
  applicationRef: string,
  interviewerPublicId: string,
  interviewScore: number,
  interviewEvaluationData?: InterviewEvaluationSubmission,
  options?: { bypassAssignmentCheck?: boolean }
): Promise<ApplicationRecord | null> {
  const scoreMaximum = interviewEvaluationData
    ? interviewScoreMaximum(interviewEvaluationData.criteria)
    : interviewScoreMaximum();

  if (
    !Number.isFinite(interviewScore) ||
    interviewScore < INTERVIEW_SCORE_MIN ||
    interviewScore > scoreMaximum
  ) {
    throw new Error(
      `Interview score must be between ${INTERVIEW_SCORE_MIN} and ${scoreMaximum}`
    );
  }

  const validatedEvaluation = interviewEvaluationData
    ? {
        ...interviewEvaluationData,
        totalScore: computeTotalInterviewScore(
          interviewEvaluationData.criterionScores,
          interviewEvaluationData.criteria
        ),
        submittedAt: new Date().toISOString(),
      }
    : undefined;

  const scoreToStore =
    validatedEvaluation?.totalScore ?? interviewScore;

  const interviewerId = await resolveUserInternalId(interviewerPublicId);
  if (!interviewerId) {
    throw new Error("Invalid interviewer");
  }

  const existing = await prisma.applicant.findFirst({
    where: {
      ...applicantWhereByRef(applicationRef),
      ...(options?.bypassAssignmentCheck ? {} : { interviewerId }),
    },
  });
  if (!existing) {
    throw new Error(
      options?.bypassAssignmentCheck
        ? "Application not found"
        : "You are not assigned to interview this application"
    );
  }

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      interviewScore: scoreToStore,
      ...(validatedEvaluation
        ? { interviewEvaluationData: validatedEvaluation }
        : {}),
      ...(options?.bypassAssignmentCheck
        ? { interviewerId }
        : {}),
      updatedAt: new Date(),
    },
    include: applicantIncludeEvaluators(),
  });
  return mapPrismaApplicant(updated);
}

/** Clears interview score and evaluation data so the interview can be redone. */
export async function resetApplicationInterview(
  id: string
): Promise<ApplicationRecord | null> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  if (!existing) return null;

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data: {
      interviewScore: null,
      interviewEvaluationData: Prisma.DbNull,
      updatedAt: new Date(),
    },
    include: applicantIncludeEvaluators(),
  });
  return mapPrismaApplicant(updated);
}

export async function getInterviewScoreSummary(
  applicationRef: string,
  user: DashboardUser
): Promise<InterviewScoreSummary | null> {
  const application = await getApplication(applicationRef);
  if (!application) return null;

  if (user.role === "Evaluator") {
    const assigned = await isApplicationAssignedToInterviewer(
      applicationRef,
      user.id
    );
    if (!assigned) return null;
  }

  const configuredCriteria = await getActiveInterviewCriteria();
  const evaluation = application.interviewEvaluationData ?? null;
  const interviewScore =
    application.interviewScore != null &&
    Number.isFinite(application.interviewScore)
      ? application.interviewScore
      : null;

  return {
    criteria: configuredCriteria,
    evaluation,
    interviewScore,
    completed: evaluation != null || interviewScore != null,
  };
}

function validateEvaluationSubmission(
  evaluation: EvaluatorEvaluationSubmission,
  rubric: Awaited<ReturnType<typeof getActiveEvaluationRubric>>
): EvaluatorEvaluationSubmission {
  const requiredIds = rubricCriterionIds(rubric);
  for (const id of requiredIds) {
    const score = evaluation.assessorScores[id];
    if (
      score === undefined ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > ASSESSOR_SCORE_MAX
    ) {
      throw new Error("Complete all criterion scores (0–5) before submitting");
    }
  }

  const categoryTotals: Record<string, number> = {};
  for (const category of rubric) {
    categoryTotals[category.id] = computeCategoryTotal(
      category,
      evaluation.assessorScores
    );
  }
  const grandTotal = rubric.reduce(
    (sum, category) =>
      sum + computeCategoryTotal(category, evaluation.assessorScores),
    0
  );

  return {
    assessorScores: evaluation.assessorScores,
    categoryTotals,
    grandTotal,
    submittedAt: evaluation.submittedAt || new Date().toISOString(),
  };
}

export async function updateEvaluatorReview(
  applicationRef: string,
  evaluatorPublicId: string,
  action: EvaluatorReviewAction,
  evaluation?: EvaluatorEvaluationSubmission
): Promise<ApplicationRecord | null> {
  const evaluatorInternalId = await resolveUserInternalId(evaluatorPublicId);
  if (!evaluatorInternalId) {
    throw new Error("Invalid evaluator");
  }

  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(applicationRef),
    include: applicantIncludeEvaluators(),
  });
  if (!existing) return null;

  let slot: 1 | 2 | null = null;
  if (existing.evaluator1Id === evaluatorInternalId) slot = 1;
  else if (existing.evaluator2Id === evaluatorInternalId) slot = 2;
  if (!slot) {
    throw new Error("You are not assigned to evaluate this application");
  }

  const currentStatus =
    slot === 1
      ? existing.evaluator1ReviewStatus
      : existing.evaluator2ReviewStatus;

  let nextStatus: EvaluatorReviewStatus;
  if (action === "accept") {
    if (currentStatus === "evaluated") {
      throw new Error("Review already completed");
    }
    nextStatus = "accepted";
  } else if (action === "reject") {
    if (currentStatus === "evaluated") {
      throw new Error("Review already completed");
    }
    nextStatus = "rejected";
  } else if (action === "reset") {
    if (currentStatus !== "rejected") {
      throw new Error("Only rejected reviews can be reset");
    }
    nextStatus = "pending";
  } else {
    if (currentStatus !== "accepted") {
      throw new Error("Applicant must be accepted before evaluation");
    }
    if (!evaluation) {
      throw new Error("Evaluation scores are required");
    }
    nextStatus = "evaluated";
  }

  const validatedEvaluation =
    action === "evaluate"
      ? validateEvaluationSubmission(
          evaluation!,
          await getActiveEvaluationRubric(existing.typeOfMobility)
        )
      : null;

  const data =
    slot === 1
      ? {
          evaluator1ReviewStatus: nextStatus,
          ...(validatedEvaluation
            ? { evaluator1EvaluationData: validatedEvaluation }
            : {}),
          updatedAt: new Date(),
        }
      : {
          evaluator2ReviewStatus: nextStatus,
          ...(validatedEvaluation
            ? { evaluator2EvaluationData: validatedEvaluation }
            : {}),
          updatedAt: new Date(),
        };

  const updated = await prisma.applicant.update({
    where: { id: existing.id },
    data,
    include: applicantIncludeEvaluators(),
  });
  const application = mapPrismaApplicant(updated);
  return enrichApplicationForEvaluator(
    application,
    updated,
    evaluatorInternalId
  );
}

export async function deleteApplication(id: string): Promise<boolean> {
  const existing = await prisma.applicant.findFirst({
    where: applicantWhereByRef(id),
  });
  if (!existing) return false;

  try {
    await deleteAllApplicationDocumentsForRefs(
      applicationDocumentStorageRefs(existing.publicId, existing.id)
    );
  } catch (err) {
    console.error("deleteApplication documents", err);
  }

  await prisma.applicant.delete({ where: { id: existing.id } });
  return true;
}
