import { CoordinatorInterviewCriterionWeights } from "../../../components/coordinator-interview-criterion-weights";

export const metadata = {
  title: "Interview Criterion Weights | Administrator | SMECC2E",
  description: "Configure interview criterion weights.",
};

export const dynamic = "force-dynamic";

export default function AdministratorInterviewCriterionWeightsPage() {
  return <CoordinatorInterviewCriterionWeights readOnly />;
}
