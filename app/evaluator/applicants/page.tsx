import { CoordinatorApplicants } from "../../components/coordinator-applicants";
import { EvaluatorEvaluationApplicants } from "../../components/evaluator-evaluation-applicants";
import { EvaluatorFinalEvaluationApplicants } from "../../components/evaluator-final-evaluation-applicants";

export const metadata = {
  title: "Applicants | Evaluator | SMECC2E",
  description: "Review assigned SMECC2E scholarship applications.",
};

export default async function EvaluatorApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === "evaluation") {
    return <EvaluatorEvaluationApplicants />;
  }

  if (status === "final_evaluation") {
    return <EvaluatorFinalEvaluationApplicants />;
  }

  return <CoordinatorApplicants statusFromUrl={status ?? null} />;
}
