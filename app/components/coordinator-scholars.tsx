"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ApplicationRecord } from "@/lib/application-types";
import {
  getScholarsNestedViewParam,
  parseScholarsManagementSection,
  parseScholarsNestedView,
  parseScholarsOnboardingView,
  scholarsNestedViewLabel,
  SCHOLARS_ONBOARDING_VIEW_LABELS,
} from "@/lib/coordinator-scholars-nav";
import { CoordinatorMobilityDetails } from "./coordinator-mobility-details";
import { CoordinatorPersonalContact } from "./coordinator-personal-contact";
import { CoordinatorPhotoPublicationConsent } from "./coordinator-photo-publication-consent";
import { CoordinatorScholarshipAcceptance } from "./coordinator-scholarship-acceptance";
import { CoordinatorScholarshipAgreement } from "./coordinator-scholarship-agreement";
import { CoordinatorScholarFormRoster } from "./coordinator-scholar-form-roster";

export function CoordinatorScholars() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeSection = parseScholarsManagementSection(sectionParam);
  const nestedView = parseScholarsNestedView(
    activeSection,
    getScholarsNestedViewParam(activeSection, searchParams)
  );
  const onboardingView = parseScholarsOnboardingView(
    searchParams.get("onboarding")
  );
  const pageTitle =
    activeSection === "onboarding"
      ? SCHOLARS_ONBOARDING_VIEW_LABELS[onboardingView]
      : scholarsNestedViewLabel(activeSection, nestedView);
  const showAcceptanceList =
    activeSection === "onboarding" && onboardingView === "acceptance";
  const showAgreementList =
    activeSection === "onboarding" && onboardingView === "agreement";
  const showContactList =
    activeSection === "onboarding" && onboardingView === "contact";
  const showMobilityList =
    activeSection === "onboarding" && onboardingView === "mobility";
  const showConsentList =
    activeSection === "onboarding" && onboardingView === "consent";
  const showFormRoster = activeSection !== "onboarding";

  const [scholars, setScholars] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScholars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scholars");
      if (!res.ok) return;
      const data = (await res.json()) as { scholars: ApplicationRecord[] };
      setScholars(data.scholars);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScholars();
  }, [loadScholars]);

  return (
    <div className="flex h-[95vh] min-w-0 flex-col overflow-auto">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            SMECC2E mobility & scholarship coordination
          </p>
        </div>
        <button
          type="button"
          onClick={loadScholars}
          disabled={loading}
          className="shrink-0 rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <main className="min-w-0 bg-slate-50 p-4 sm:p-6">
        {showAcceptanceList ? (
          <CoordinatorScholarshipAcceptance
            scholars={scholars}
            loading={loading}
            onRejected={loadScholars}
          />
        ) : showAgreementList ? (
          <CoordinatorScholarshipAgreement
            scholars={scholars}
            loading={loading}
            onRejected={loadScholars}
          />
        ) : showContactList ? (
          <CoordinatorPersonalContact
            scholars={scholars}
            loading={loading}
            onRejected={loadScholars}
          />
        ) : showMobilityList ? (
          <CoordinatorMobilityDetails
            scholars={scholars}
            loading={loading}
            onRejected={loadScholars}
          />
        ) : showConsentList ? (
          <CoordinatorPhotoPublicationConsent
            scholars={scholars}
            loading={loading}
            onRejected={loadScholars}
          />
        ) : showFormRoster ? (
          <CoordinatorScholarFormRoster
            scholars={scholars}
            loading={loading}
            section={activeSection}
            viewId={nestedView}
            viewLabel={pageTitle}
          />
        ) : null}
      </main>
    </div>
  );
}
