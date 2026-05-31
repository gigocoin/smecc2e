import { CoordinatorRegions } from "../../components/coordinator-regions";

export const metadata = {
  title: "Regions | Administrator | SMECC2E",
  description: "SMECC2E administrator dashboard regional applicant breakdown.",
};

export default function AdministratorRegionsPage() {
  return <CoordinatorRegions hideEditDelete />;
}
