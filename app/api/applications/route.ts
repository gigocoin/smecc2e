import { NextResponse } from "next/server";
import type { ApplicationPayload } from "@/lib/application-types";
import { AuthError, requireDashboardSessionUser } from "@/lib/auth-service";
import { assertApplicantPayloadMatchesSession } from "@/lib/applicant-application-auth";
import {
  ApplicantAuthError,
  requireApplicantPasswordChanged,
} from "@/lib/applicant-auth-service";
import {
  DuplicateApplicationError,
  listApplications,
  submitApplication,
} from "@/lib/applications-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";
import { sendApplicationConfirmationEmail } from "@/lib/send-application-confirmation-email";

export async function GET(request: Request) {
  try {
    const user = await requireDashboardSessionUser();
    const searchParams = new URL(request.url).searchParams;
    const forInterview = searchParams.get("forInterview") === "true";
    const forEvaluation = searchParams.get("forEvaluation") === "true";

    const assignedToEvaluatorPublicId =
      user.role === "Evaluator" && !forInterview
        ? user.id
        : user.role === "Administrator" && forEvaluation
          ? user.id
          : undefined;

    const applications = await listApplications({
      interviewQueueForPublicId:
        user.role === "Evaluator" && forInterview ? user.id : undefined,
      assignedToEvaluatorPublicId,
      includeDrafts:
        (user.role === "Coordinator" || user.role === "Administrator") &&
        !forEvaluation,
      // Administrators only see nominees hosted at their own institution.
      hostInstitutionForOffered:
        user.role === "Administrator" && !forEvaluation && !forInterview
          ? user.institution
          : undefined,
    });
    return NextResponse.json({ applications });
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("GET /api/applications", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      {
        error:
          connectionError ?? "Failed to load applications from database",
      },
      { status: connectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApplicantPasswordChanged();
    const body = (await request.json()) as ApplicationPayload & {
      applicationId?: string;
    };
    const { applicationId, ...payload } = body;
    assertApplicantPayloadMatchesSession(user, payload);

    const record = await submitApplication(payload, applicationId);
    const confirmationEmail = await sendApplicationConfirmationEmail(record);
    return NextResponse.json(
      {
        application: record,
        confirmationEmailSent: confirmationEmail.sent,
        confirmationEmailError: confirmationEmail.error,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ApplicantAuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    if (err instanceof DuplicateApplicationError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("POST /api/applications", err);
    const connectionError = toUserFacingDatabaseError(err);
    const message =
      connectionError ??
      (err instanceof Error ? err.message : "Failed to save application");
    const isClientError =
      !connectionError &&
      err instanceof Error &&
      (/complete all required fields/i.test(err.message) ||
        /verify your email/i.test(err.message) ||
        /email is required/i.test(err.message) ||
        /application deadline has passed/i.test(err.message));
    return NextResponse.json(
      { error: message },
      { status: connectionError ? 503 : isClientError ? 400 : 500 }
    );
  }
}
