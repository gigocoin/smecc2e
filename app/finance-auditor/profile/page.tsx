import { DashboardSettings } from "../../components/dashboard-settings";

export const metadata = {
  title: "Profile | Finance Auditor | SMECC2E",
  description: "Update your finance auditor profile and password.",
};

export const dynamic = "force-dynamic";

export default function FinanceAuditorProfilePage() {
  return <DashboardSettings />;
}
