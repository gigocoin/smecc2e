import { CoordinatorApplicants } from "../../components/coordinator-applicants";
import { EvaluatorEvaluationApplicants } from "../../components/evaluator-evaluation-applicants";
import { EvaluatorFinalEvaluationApplicants } from "../../components/evaluator-final-evaluation-applicants";
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

  if (status === "evaluation") {
    return <EvaluatorEvaluationApplicants />;
  }

  if (status === "interview") {
    return <InterviewApplicants />;
  }

  if (status === "final_evaluation") {
    return <EvaluatorFinalEvaluationApplicants />;
  }

  return <CoordinatorApplicants statusFromUrl={status ?? null} />;
}
