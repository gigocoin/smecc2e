import { DashboardSettings } from "../../components/dashboard-settings";

export const metadata = {
  title: "Profile | Finance Officer | SMECC2E",
  description: "Update your finance officer profile and password.",
};

export const dynamic = "force-dynamic";

export default function FinanceOfficerProfilePage() {
  return <DashboardSettings />;
}
