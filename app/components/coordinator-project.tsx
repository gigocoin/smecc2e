"use client";

import { useSearchParams } from "next/navigation";
import {
  isWorkPackageSection,
  PROJECT_MANAGEMENT_SECTION_LABELS,
  parseProjectManagementSection,
} from "@/lib/coordinator-project-nav";
import { useDashboardPortal } from "./dashboard-portal-provider";
import { CoordinatorProjectDeliverables } from "./coordinator-project-deliverables";
import { CoordinatorProjectMandE } from "./coordinator-project-m-and-e";
import { CoordinatorProjectMilestones } from "./coordinator-project-milestones";
import { CoordinatorProjectRisks } from "./coordinator-project-risks";
import { CoordinatorProjectWorkPackages } from "./coordinator-project-work-packages";

export function CoordinatorProject() {
  const searchParams = useSearchParams();
  const { portalKey } = useDashboardPortal();
  const sectionParam = searchParams.get("section");
  const activeSection = parseProjectManagementSection(sectionParam);
  const pageTitle = PROJECT_MANAGEMENT_SECTION_LABELS[activeSection];
  const canManageProject = portalKey === "coordinator";
  const canEditTaskStatus =
    portalKey === "administrator" || portalKey === "evaluator";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Project management · SMECC2E coordination
          </p>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        {isWorkPackageSection(activeSection) ? (
          <CoordinatorProjectWorkPackages
            workPackage={activeSection}
            canManage={canManageProject}
            canEditStatus={canEditTaskStatus}
          />
        ) : activeSection === "milestones" ? (
          <CoordinatorProjectMilestones canManage={canManageProject} />
        ) : activeSection === "deliverables" ? (
          <CoordinatorProjectDeliverables canManage={canManageProject} />
        ) : activeSection === "m_and_e" ? (
          <CoordinatorProjectMandE canManage={canManageProject} />
        ) : activeSection === "risks" ? (
          <CoordinatorProjectRisks canManage={canManageProject} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-slate-800">
              {pageTitle} tools and tracking will be available here. Use the
              sidebar flyout under{" "}
              <strong className="text-[#062763]">Project management</strong> to
              switch between project areas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
