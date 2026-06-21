import { CoordinatorCriterionWeights } from "../../components/coordinator-criterion-weights";

export const metadata = {
  title: "Evaluation Criterion Weights | Coordinator | SMECC2E",
  description: "Configure evaluation scorecard criterion weights.",
};

export const dynamic = "force-dynamic";

export default function CoordinatorCriterionWeightsPage() {
  return <CoordinatorCriterionWeights />;
}
