"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApplicantResetPasswordModal } from "./applicant-reset-password-modal";
import { NomineeLetterModal } from "./nominee-letter-modal";
import { AdditionalFundingDisclosureForm } from "./additional-funding-disclosure-form";
import { BankAccountDetailsForm } from "./bank-account-details-form";
import { BankContactChangeRequestForm } from "./bank-contact-change-request-form";
import { ConfirmationOfArrivalForm } from "./confirmation-of-arrival-form";
import { InsuranceRegistrationForm } from "./insurance-registration-form";
import { PaymentSuspensionCaseForm } from "./payment-suspension-case-form";
import { MobilityDetailsConfirmationForm } from "./mobility-details-confirmation-form";
import { PhotoPublicationConsentForm } from "./photo-publication-consent-form";
import { PersonalContactUpdateForm } from "./personal-contact-update-form";
import { PreDepartureReadinessForm } from "./pre-departure-readiness-form";
import { ResearchCostRequestForm } from "./research-cost-request-form";
import { ResearchExpenditureReportForm } from "./research-expenditure-report-form";
import { ScholarConfirmationOfPaymentForm } from "./scholar-confirmation-of-payment-form";
import { ScholarshipAcceptanceForm } from "./scholarship-acceptance-form";
import { ScholarshipAgreementForm } from "./scholarship-agreement-form";
import { ScholarshipInstallmentPaymentForm } from "./scholarship-installment-payment-form";
import { ScholarshipRepaymentRecoveryForm } from "./scholarship-repayment-recovery-form";
import { SpecialNeedsDisbursementForm } from "./special-needs-disbursement-form";
import { TravelEvidenceSubmissionForm } from "./travel-evidence-submission-form";
import { TravelLogisticsArrangementForm } from "./travel-logistics-arrangement-form";
import { VisaResidencePermitForm } from "./visa-residence-permit-form";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import type { ApplicationStatus } from "@/lib/application-types";
import {
  parseScholarArrivalView,
  parseScholarFinanceView,
  parseScholarOnboardingView,
  parseScholarSection,
  SCHOLAR_ARRIVAL_NAV,
  SCHOLAR_FINANCE_NAV,
  SCHOLAR_ONBOARDING_NAV,
  scholarArrivalHref,
  scholarFinanceHref,
  scholarNavForMobility,
  scholarOnboardingHref,
  scholarSectionHref,
  type ScholarArrivalView,
  type ScholarFinanceView,
  type ScholarOnboardingView,
  type ScholarSectionId,
} from "@/lib/scholar-nav";

const SCHOLAR_STATUSES = new Set<ApplicationStatus>([
  "offered",
  "approved",
  "pre_departure",
  "reserved",
]);

const SECTION_INTRO: Record<
  Exclude<ScholarSectionId, "onboarding" | "pre_departure" | "finance">,
  string
> = {
  academic_plan:
    "Your host, programme, and mobility type are the plan for this scholarship stay.",
  supervision:
    "Supervision meetings and progress reports are collected with your host supervisor during the stay.",
  traineeships:
    "This area is for the traineeship work plan, host placement, and the traineeship report.",
  internships:
    "This area is for the internship placement and internship report. Traineeship and staff mobilities use their own records.",
  research_alumni:
    "Publications, research outputs, and your alumni record are kept after the mobility.",
  grievance:
    "Welfare concerns and complaints are logged with your host contact and the SMECC2E coordination team.",
  mobility_changes:
    "Requests to change host, duration, or programme are agreed with your host university and the coordination team.",
  completion:
    "Completion documents and recognition of the mobility are recorded when the scholarship stay ends.",
  collaborations:
    "Joint work with partner universities during the mobility is recorded here.",
};

const ONBOARDING_INTRO: Record<
  Exclude<ScholarOnboardingView, "agreement">,
  string
> = {
  acceptance:
    "Confirm that you accept the SMECC2E scholarship and declare any other funding before the agreement is signed.",
  contact:
    "This is the name and email on your scholarship record. Write to the coordination team if either needs to change.",
  mobility:
    "Confirm the host university, mobility type, and programme before travel is arranged.",
  consent:
    "Photo and publication consent covers use of your image and scholarship story in SMECC2E reports and partner communications.",
};

const PRE_DEPARTURE_INTRO: Record<ScholarArrivalView, string> = {
  readiness:
    "Complete orientation and the pre-departure checklist with your host university before you travel.",
  visa:
    "Track the visa or residence permit required for your host country.",
  travel:
    "Flights, routes, and arrival logistics are arranged with your host university.",
  evidence:
    "Submit tickets and other travel evidence for this mobility.",
  insurance:
    "Register insurance cover and confirm that it meets the scholarship requirements.",
  arrival:
    "Confirm that you have arrived and completed registration at the host university.",
};

const FINANCE_INTRO: Record<ScholarFinanceView, string> = {
  bank_account:
    "Record the bank account used for SMECC2E scholarship payments.",
  bank_contact_change:
    "Request a change to your bank or payment contact details when your account information changes.",
  repayment:
    "Track scholarship repayment or recovery cases linked to your award.",
  installment_record:
    "Review installment payment records issued against your scholarship.",
  payment_confirmation:
    "Confirm that a scholarship payment has been received.",
  payment_suspension:
    "Open or follow a payment suspension, adjustment, or delay case.",
  research_cost:
    "Submit a research cost request for eligible mobility research expenses.",
  research_expenditure:
    "Report how approved research funds were spent or utilised.",
  additional_funding:
    "Disclose any additional funding received alongside the SMECC2E scholarship.",
  special_needs:
    "Request or record a special-needs disbursement linked to your mobility.",
};

function scholarStatusLabel(status: ApplicationStatus | null | undefined): string {
  switch (status) {
    case "offered":
      return "Nominated";
    case "approved":
      return "Approved";
    case "pre_departure":
      return "Pre-departure";
    case "reserved":
      return "Reserved";
    case "rejected":
      return "Not awarded";
    case "interview":
      return "Invited for interview";
    default:
      return "In selection";
  }
}

function statusTone(status: ApplicationStatus | null | undefined): string {
  if (status === "approved" || status === "pre_departure" || status === "offered") {
    return "bg-emerald-100 text-emerald-900";
  }
  if (status === "reserved") return "bg-amber-100 text-amber-950";
  if (status === "rejected") return "bg-red-100 text-red-900";
  if (status === "interview") return "bg-violet-100 text-violet-950";
  return "bg-sky-100 text-sky-950";
}

function journeyIndex(status: ApplicationStatus | null | undefined): number {
  if (status === "approved" || status === "pre_departure") return 3;
  if (status === "offered" || status === "reserved") return 2;
  if (status === "rejected") return 1;
  if (!status || status === "draft") return 0;
  return 1;
}

type AwardLetter = {
  host: string;
  mobilityType: string;
  areaOfStudy: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
};

function awardText(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || text === "[pending]" || text === "—") return "";
  return text;
}

function awardOrPending(
  primary: string | null | undefined,
  fallback: string | null | undefined
): string {
  return awardText(primary) || awardText(fallback) || "Pending";
}

function awardDuration(months: string | null | undefined): string {
  const text = awardText(months);
  if (!text) return "";
  return /^\d+(\.\d+)?$/.test(text) ? `${text} months` : text;
}

function scholarAwardDetails(
  app: ApplicantSessionUser["application"],
  award: AwardLetter | null
): { label: string; value: string }[] {
  const duration = awardDuration(award?.durationMonths);
  const dates = [awardText(award?.startDate), awardText(award?.endDate)]
    .filter(Boolean)
    .join(" – ");
  return [
    { label: "Reference", value: app?.publicId || app?.id || "Not assigned" },
    {
      label: "Host university",
      value: awardOrPending(award?.host, app?.preferredHostInstitution),
    },
    {
      label: "Type of mobility",
      value: awardOrPending(award?.mobilityType, app?.typeOfMobility),
    },
    {
      label: "Area of study",
      value: awardOrPending(award?.areaOfStudy, app?.proposedAcademicProgramme),
    },
    ...(duration ? [{ label: "Duration", value: duration }] : []),
    ...(dates ? [{ label: "Mobility dates", value: dates }] : []),
  ];
}

const JOURNEY = [
  {
    label: "Application",
    detail: "Registration and the 1st cohort application",
  },
  {
    label: "Selection",
    detail: "Eligibility, evaluation, and interview",
  },
  {
    label: "Nomination",
    detail: "Host offer and scholarship agreement",
  },
  {
    label: "Mobility",
    detail: "Pre-departure and the scholarship stay",
  },
] as const;

export function ScholarDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ApplicantSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [preDepartureOpen, setPreDepartureOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementMessage, setAgreementMessage] = useState<string | null>(null);
  const [award, setAward] = useState<AwardLetter | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/applicant/me");
      const data = (await res.json()) as {
        user?: ApplicantSessionUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error ?? "Could not load your scholar dashboard.");
        return;
      }
      if (data.user.mustChangePassword) {
        router.replace("/applicant/change-password?redirect=%2Fscholar");
        return;
      }
      setUser(data.user);
    } catch {
      setError("Could not load your scholar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/nominee-letter");
        if (!res.ok) return;
        const data = (await res.json()) as {
          letter?: {
            editable?: {
              hostUniversity?: string;
              mobilityType?: string;
              areaOfStudy?: string;
              durationMonths?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
            };
          };
        };
        if (cancelled || !data.letter?.editable) return;
        const editable = data.letter.editable;
        setAward({
          host: editable.hostUniversity ?? "",
          mobilityType: editable.mobilityType ?? "",
          areaOfStudy: editable.areaOfStudy ?? "",
          durationMonths: editable.durationMonths ?? "",
          startDate: editable.mobilityStartDate ?? "",
          endDate: editable.mobilityEndDate ?? "",
        });
      } catch {
        if (!cancelled) setAward(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sectionParam = searchParams.get("section");
  const onboardingParam = searchParams.get("onboarding");
  const arrivalParam = searchParams.get("arrival");
  const financeParam = searchParams.get("finance");
  useEffect(() => {
    setOnboardingOpen(false);
    setPreDepartureOpen(false);
    setFinanceOpen(false);
  }, [sectionParam, onboardingParam, arrivalParam, financeParam]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/applicant/logout", { method: "POST" });
      window.location.href = "/scholar/login";
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm font-semibold text-[#062763]">
        Loading your scholar dashboard…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error ?? "Could not load your scholar dashboard."}
        </div>
      </div>
    );
  }

  const app = user.application;
  const displayName =
    app?.firstName || app?.surname
      ? `${app.firstName} ${app.surname}`.trim()
      : user.email;
  const navItems = scholarNavForMobility(
    awardText(award?.mobilityType) || app?.typeOfMobility
  );
  const awardDetails = scholarAwardDetails(app, award);
  const section = parseScholarSection(searchParams.get("section"), navItems);
  const onboardingView =
    section === "onboarding"
      ? parseScholarOnboardingView(searchParams.get("onboarding"))
      : null;
  const arrivalView =
    section === "pre_departure"
      ? parseScholarArrivalView(searchParams.get("arrival"))
      : null;
  const financeView =
    section === "finance"
      ? parseScholarFinanceView(searchParams.get("finance"))
      : null;
  const activeItem = navItems.find((item) => item.id === section) ?? navItems[0];
  const onboardingItem = SCHOLAR_ONBOARDING_NAV.find(
    (item) => item.id === onboardingView
  );
  const arrivalItem = SCHOLAR_ARRIVAL_NAV.find((item) => item.id === arrivalView);
  const financeItem = SCHOLAR_FINANCE_NAV.find((item) => item.id === financeView);

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg border border-slate-200 p-2 text-[#062763]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="text-sm font-bold text-[#062763]">Scholar portal</p>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-white/10 bg-[#062763] text-white transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="relative h-10 w-10 shrink-0 rounded-lg bg-white p-1">
            <Image
              src="/images/logo1.png"
              alt="SMECC2E"
              fill
              className="object-contain p-0.5"
              sizes="40px"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#f7be2a]">
              SMECC2E
            </p>
            <p className="text-sm font-bold leading-tight text-white">Scholar portal</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Scholar">
          {navItems.map((item) => {
            if (item.id === "onboarding") {
              return (
                <ScholarNavFlyout
                  key={item.id}
                  label="Onboarding"
                  items={SCHOLAR_ONBOARDING_NAV}
                  hrefFor={(id) => scholarOnboardingHref(id as ScholarOnboardingView)}
                  open={onboardingOpen}
                  groupActive={section === "onboarding"}
                  activeId={onboardingView}
                  onToggle={() => {
                    setOnboardingOpen((open) => !open);
                    setPreDepartureOpen(false);
                    setFinanceOpen(false);
                  }}
                  onClose={() => setOnboardingOpen(false)}
                  onNavigate={() => {
                    setOnboardingOpen(false);
                    setSidebarOpen(false);
                  }}
                />
              );
            }
            if (item.id === "pre_departure") {
              return (
                <ScholarNavFlyout
                  key={item.id}
                  label="Pre-Departure & Arrival"
                  items={SCHOLAR_ARRIVAL_NAV}
                  hrefFor={(id) => scholarArrivalHref(id as ScholarArrivalView)}
                  panelWidth={360}
                  open={preDepartureOpen}
                  groupActive={section === "pre_departure"}
                  activeId={arrivalView}
                  onToggle={() => {
                    setPreDepartureOpen((open) => !open);
                    setOnboardingOpen(false);
                    setFinanceOpen(false);
                  }}
                  onClose={() => setPreDepartureOpen(false)}
                  onNavigate={() => {
                    setPreDepartureOpen(false);
                    setSidebarOpen(false);
                  }}
                />
              );
            }
            if (item.id === "finance") {
              return (
                <ScholarNavFlyout
                  key={item.id}
                  label="Scholars Finance"
                  items={SCHOLAR_FINANCE_NAV}
                  hrefFor={(id) => scholarFinanceHref(id as ScholarFinanceView)}
                  panelWidth={360}
                  open={financeOpen}
                  groupActive={section === "finance"}
                  activeId={financeView}
                  onToggle={() => {
                    setFinanceOpen((open) => !open);
                    setOnboardingOpen(false);
                    setPreDepartureOpen(false);
                  }}
                  onClose={() => setFinanceOpen(false)}
                  onNavigate={() => {
                    setFinanceOpen(false);
                    setSidebarOpen(false);
                  }}
                />
              );
            }
            const active = item.id === section;
            return (
              <Link
                key={item.id}
                href={scholarSectionHref(item.id)}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 text-left text-sm font-semibold leading-snug transition ${
                  active
                    ? "bg-[#f7be2a] text-[#062763]"
                    : "text-white hover:bg-white/15"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-white/10 px-4 py-4">
          <div className="rounded-lg bg-white/10 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-[#f7be2a]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              setResetPasswordOpen(true);
            }}
            className="block w-full rounded-lg border border-white/25 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Reset password
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="block w-full rounded-lg border border-[#f7be2a]/50 px-3 py-2 text-center text-xs font-semibold text-[#f7be2a] transition hover:bg-[#f7be2a] hover:text-[#062763] disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="min-h-dvh lg:pl-72">
        <ApplicantResetPasswordModal
          open={resetPasswordOpen}
          email={user.email}
          onClose={() => setResetPasswordOpen(false)}
        />

        {agreementOpen && app && (
          <NomineeLetterModal
            applicationId={app.id}
            applicantName={displayName}
            mode="sign"
            onClose={() => setAgreementOpen(false)}
            onSent={() => undefined}
            onSigned={(message) => setAgreementMessage(message)}
            onRejected={(message) => {
              setAgreementMessage(message);
              setAgreementOpen(false);
              void loadUser();
            }}
          />
        )}

        <main className="px-4 py-6 sm:px-6 sm:py-8">
          {section === "onboarding" && onboardingView === null ? (
            <OnboardingPanel
              user={user}
              displayName={displayName}
              awardDetails={awardDetails}
              agreementMessage={agreementMessage}
              onOpenAgreement={() => {
                setAgreementMessage(null);
                setAgreementOpen(true);
              }}
            />
          ) : section === "onboarding" && onboardingView === "agreement" ? (
            <ScholarshipAgreementForm
              user={user}
              displayName={displayName}
              onViewAgreement={() => {
                setAgreementMessage(null);
                setAgreementOpen(true);
              }}
            />
          ) : section === "onboarding" && onboardingView === "acceptance" ? (
            <ScholarshipAcceptanceForm user={user} displayName={displayName} />
          ) : section === "onboarding" && onboardingView === "contact" ? (
            <PersonalContactUpdateForm user={user} displayName={displayName} />
          ) : section === "onboarding" && onboardingView === "mobility" ? (
            <MobilityDetailsConfirmationForm user={user} displayName={displayName} />
          ) : section === "onboarding" && onboardingView === "consent" ? (
            <PhotoPublicationConsentForm user={user} displayName={displayName} />
          ) : section === "onboarding" && onboardingView ? (
            <SectionPanel
              eyebrow="Onboarding"
              title={onboardingItem?.label ?? "Onboarding"}
              intro={
                ONBOARDING_INTRO[
                  onboardingView as Exclude<ScholarOnboardingView, "agreement">
                ]
              }
              details={onboardingDetails(onboardingView, user, displayName, award)}
            />
          ) : section === "pre_departure" && arrivalView === "readiness" ? (
            <PreDepartureReadinessForm user={user} displayName={displayName} />
          ) : section === "pre_departure" && arrivalView === "visa" ? (
            <VisaResidencePermitForm user={user} displayName={displayName} />
          ) : section === "pre_departure" && arrivalView === "travel" ? (
            <TravelLogisticsArrangementForm
              user={user}
              displayName={displayName}
            />
          ) : section === "pre_departure" && arrivalView === "evidence" ? (
            <TravelEvidenceSubmissionForm
              user={user}
              displayName={displayName}
            />
          ) : section === "pre_departure" && arrivalView === "insurance" ? (
            <InsuranceRegistrationForm user={user} displayName={displayName} />
          ) : section === "pre_departure" && arrivalView === "arrival" ? (
            <ConfirmationOfArrivalForm user={user} displayName={displayName} />
          ) : section === "pre_departure" ? (
            <SectionPanel
              eyebrow="Pre-Departure & Arrival"
              title={arrivalItem?.label ?? "Pre-Departure & Arrival"}
              intro={
                arrivalView
                  ? PRE_DEPARTURE_INTRO[arrivalView]
                  : "Travel, insurance, visa, and arrival arrangements are confirmed here with your host university before you leave."
              }
              details={awardDetails}
            />
          ) : section === "finance" && financeView === "bank_account" ? (
            <BankAccountDetailsForm user={user} displayName={displayName} />
          ) : section === "finance" && financeView === "bank_contact_change" ? (
            <BankContactChangeRequestForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" && financeView === "repayment" ? (
            <ScholarshipRepaymentRecoveryForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" && financeView === "installment_record" ? (
            <ScholarshipInstallmentPaymentForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" &&
            financeView === "payment_confirmation" ? (
            <ScholarConfirmationOfPaymentForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" && financeView === "payment_suspension" ? (
            <PaymentSuspensionCaseForm user={user} displayName={displayName} />
          ) : section === "finance" && financeView === "research_cost" ? (
            <ResearchCostRequestForm user={user} displayName={displayName} />
          ) : section === "finance" && financeView === "research_expenditure" ? (
            <ResearchExpenditureReportForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" && financeView === "additional_funding" ? (
            <AdditionalFundingDisclosureForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" && financeView === "special_needs" ? (
            <SpecialNeedsDisbursementForm
              user={user}
              displayName={displayName}
            />
          ) : section === "finance" ? (
            <SectionPanel
              eyebrow="Scholars Finance"
              title={financeItem?.label ?? "Scholars Finance"}
              intro={
                financeView
                  ? FINANCE_INTRO[financeView]
                  : "Allowance schedules, bank details, insurance costs, and research-cost records are kept with your host university."
              }
              details={awardDetails}
            />
          ) : (
            <SectionPanel
              title={activeItem?.label ?? "Scholar"}
              intro={
                SECTION_INTRO[
                  section as Exclude<
                    ScholarSectionId,
                    "onboarding" | "pre_departure" | "finance"
                  >
                ]
              }
              details={awardDetails}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function OnboardingPanel({
  user,
  displayName,
  awardDetails,
  heading,
  agreementMessage,
  onOpenAgreement,
}: {
  user: ApplicantSessionUser;
  displayName: string;
  awardDetails: { label: string; value: string }[];
  heading?: string;
  agreementMessage: string | null;
  onOpenAgreement: () => void;
}) {
  const app = user.application;
  const isScholar = Boolean(app && SCHOLAR_STATUSES.has(app.status));
  const canOpenAgreement = app?.status === "offered" || app?.status === "approved";
  const step = journeyIndex(app?.status);
  const submitted = app?.submittedAt
    ? new Date(app.submittedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
          Onboarding
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#062763]">
          {heading ??
            `Welcome${displayName !== user.email ? `, ${displayName}` : ""}`}
        </h1>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Your scholarship
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#062763]">
              SMECC2E mobility scholarship
            </h2>
            {submitted && (
              <p className="mt-1 text-sm text-slate-600">
                Application submitted {submitted}
              </p>
            )}
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(app?.status)}`}
          >
            {scholarStatusLabel(app?.status)}
          </span>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {awardDetails.map((detail) => (
            <Detail key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </div>

        <div className="space-y-4 px-6 py-5">
          {agreementMessage && (
            <p
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
              role="status"
            >
              {agreementMessage}
            </p>
          )}
          <p className="text-sm leading-6 text-slate-700">
            {statusCopy(app?.status, isScholar)}
          </p>
          {canOpenAgreement && (
            <button
              type="button"
              onClick={onOpenAgreement}
              className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580]"
            >
              View / sign agreement
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#062763]">Scholarship progress</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY.map((item, index) => {
            const state =
              app?.status === "rejected"
                ? index <= 1
                  ? "done"
                  : "stopped"
                : index < step
                  ? "done"
                  : index === step
                    ? "current"
                    : "upcoming";
            return (
              <li key={item.label} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    state === "done"
                      ? "bg-emerald-600 text-white"
                      : state === "current"
                        ? "bg-[#062763] text-[#f7be2a]"
                        : state === "stopped"
                          ? "bg-slate-200 text-slate-500"
                          : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#062763]">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {state === "done"
                      ? "Complete"
                      : state === "current"
                        ? "Current"
                        : state === "stopped"
                          ? "Closed"
                          : "Upcoming"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function SectionPanel({
  title,
  intro,
  details,
  eyebrow = "Scholar portal",
}: {
  title: string;
  intro: string;
  details: { label: string; value: string }[];
  eyebrow?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#062763]">{title}</h1>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-sm leading-6 text-slate-700">{intro}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {details.map((detail) => (
            <Detail key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </dl>
      </section>
    </div>
  );
}

function onboardingDetails(
  view: ScholarOnboardingView,
  user: ApplicantSessionUser,
  displayName: string,
  award: AwardLetter | null
): { label: string; value: string }[] {
  const app = user.application;
  const awardDetails = scholarAwardDetails(app, award);
  if (view === "contact") {
    return [
      { label: "Name", value: displayName },
      { label: "Email", value: user.email },
      { label: "Reference", value: app?.publicId || app?.id || "Not assigned" },
    ];
  }
  if (view === "acceptance") {
    return [
      { label: "Status", value: scholarStatusLabel(app?.status) },
      ...awardDetails.filter((detail) => detail.label !== "Reference").slice(0, 2),
      { label: "Reference", value: app?.publicId || app?.id || "Not assigned" },
    ];
  }
  return awardDetails;
}

function flyoutPanelPosition(
  rect: DOMRect,
  panelWidth: number
): { top: number; left: number; maxHeight: number } {
  const margin = 8;
  const preferredMax = Math.min(window.innerHeight * 0.7, 28 * 16);
  const spaceBelow = window.innerHeight - rect.top - margin;
  const spaceAbove = rect.bottom - margin;
  let maxHeight = Math.min(preferredMax, Math.max(spaceBelow, 0));
  let top = rect.top;

  if (maxHeight < 180 && spaceAbove > spaceBelow) {
    maxHeight = Math.min(preferredMax, spaceAbove);
    top = Math.max(margin, rect.bottom - maxHeight);
  }

  if (top + maxHeight > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - margin - maxHeight);
  }

  let left = rect.right + 4;
  if (left + panelWidth > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - margin - panelWidth);
  }

  return { top, left, maxHeight };
}

function ScholarNavFlyout({
  label,
  items,
  hrefFor,
  open,
  groupActive,
  activeId,
  onToggle,
  onClose,
  onNavigate,
  panelWidth = 320,
}: {
  label: string;
  items: readonly { id: string; label: string }[];
  hrefFor: (id: string) => string;
  open: boolean;
  groupActive: boolean;
  activeId: string | null;
  onToggle: () => void;
  onClose: () => void;
  onNavigate: () => void;
  panelWidth?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const updatePosition = () => {
      const el = rootRef.current;
      if (!el) return;
      setPanelPos(flyoutPanelPosition(el.getBoundingClientRect(), panelWidth));
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, panelWidth]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold leading-snug transition ${
          groupActive
            ? "bg-[#f7be2a] text-[#062763]"
            : "text-white hover:bg-white/15"
        }`}
      >
        <span className="flex-1">{label}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "translate-x-0.5" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && panelPos && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          style={{
            top: panelPos.top,
            left: panelPos.left,
            maxHeight: panelPos.maxHeight,
            width: panelWidth,
          }}
          className="fixed z-[70] overflow-x-hidden overflow-y-auto rounded-lg border border-white/15 bg-[#062763] py-2 shadow-2xl"
        >
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={hrefFor(item.id)}
                role="menuitem"
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`block px-4 py-2.5 text-sm font-semibold leading-snug transition ${
                  active
                    ? "bg-[#f7be2a] text-[#062763]"
                    : "text-white hover:bg-white/15"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusCopy(
  status: ApplicationStatus | null | undefined,
  isScholar: boolean
): string {
  if (status === "offered") {
    return "You have been nominated. Open the scholarship agreement to review the nomination letter and add your signature.";
  }
  if (status === "approved") {
    return "Your scholarship is approved. Keep the signed agreement with your host university and follow pre-departure instructions from SMECC2E.";
  }
  if (status === "pre_departure") {
    return "You are in pre-departure. Your host university and the coordination team will confirm travel, insurance, and arrival details.";
  }
  if (status === "reserved") {
    return "You are on the reserve list. This dashboard will update if a scholarship place is offered.";
  }
  if (status === "rejected") {
    return "This application was not awarded a scholarship for the 1st cohort.";
  }
  if (isScholar) {
    return "Use this dashboard to follow your nomination, scholarship agreement, and mobility details.";
  }
  return "This portal is for nominated and approved scholars. Scholarship tools stay closed while your application is still in selection.";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#062763]">{value}</p>
    </div>
  );
}
