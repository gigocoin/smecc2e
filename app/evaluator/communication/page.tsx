import { Suspense } from "react";
import { CoordinatorCommunication } from "../../components/coordinator-communication";

export const metadata = {
  title: "Communication & Knowledge | Evaluator | SMECC2E",
  description: "SMECC2E evaluator communication and knowledge management.",
};

export default function EvaluatorCommunicationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
          Loading communication &amp; knowledge…
        </div>
      }
    >
      <CoordinatorCommunication />
    </Suspense>
  );
}
