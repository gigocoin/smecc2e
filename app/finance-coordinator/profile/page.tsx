import { DashboardSettings } from "../../components/dashboard-settings";

export const metadata = {
  title: "Profile | Finance Coordinator | SMECC2E",
  description: "Update your finance coordinator profile and password.",
};

export const dynamic = "force-dynamic";

export default function FinanceCoordinatorProfilePage() {
  return <DashboardSettings />;
}
