import { CoordinatorRegions } from "../../components/coordinator-regions";

export const metadata = {
  title: "Regions | Evaluator | SMECC2E",
  description: "SMECC2E evaluator dashboard regional applicant breakdown.",
};

export default function EvaluatorRegionsPage() {
  return <CoordinatorRegions hideEditDelete />;
}
