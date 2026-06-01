import { NextResponse } from "next/server";
import {
  createVerificationToken,
  isValidEmail,
  normalizeEmail,
} from "@/lib/email-verification-store";
import { provisionApplicantCredentials } from "@/lib/applicant-account-service";
import {
  buildVerificationUrl,
  sendVerificationEmail,
} from "@/lib/send-verification-email";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(email);
    const { tempPassword } = await provisionApplicantCredentials(normalized);
    const { token } = await createVerificationToken(normalized, tempPassword);
    const verifyUrl = buildVerificationUrl(token);
    const mailResult = await sendVerificationEmail(
      normalized,
      verifyUrl,
      tempPassword
    );

    return NextResponse.json({
      ok: true,
      email: normalized,
      message: mailResult.sent
        ? tempPassword
          ? `A verification link and temporary password have been sent to ${normalized}. Check your inbox and spam folder.`
          : `A verification link has been sent to ${normalized}. Sign in with your existing dashboard password.`
        : mailResult.error ??
          `Resend is not configured. Use the verification link below to continue.`,
      sent: mailResult.sent,
      devLink: mailResult.devLink,
    });
  } catch (err) {
    console.error("POST /api/verify-email/send", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Could not send verification email.";
    const isMissingClient =
      message.includes("applicantAccount") ||
      message.includes("Cannot read properties of undefined");
    return NextResponse.json(
      {
        error: isMissingClient
          ? "Applicant accounts are not initialized. Run: npx prisma generate (restart the dev server first)."
          : "Could not send verification email. Please try again.",
      },
      { status: 500 }
    );
  }
}
