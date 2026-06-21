import { CoordinatorApplicants } from "../../components/coordinator-applicants";
import { CoordinatorFinalEvaluationApplicants } from "../../components/coordinator-final-evaluation-applicants";
import { InterviewApplicants } from "../../components/interview-applicants";

export const metadata = {
  title: "Applicants | Administrator | SMECC2E",
  description: "Review and manage SMECC2E scholarship applications.",
};

export default async function AdministratorApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === "interview") {
    return <InterviewApplicants />;
  }

  if (status === "final_evaluation") {
    return <CoordinatorFinalEvaluationApplicants />;
  }

  return <CoordinatorApplicants statusFromUrl={status ?? null} />;
}
