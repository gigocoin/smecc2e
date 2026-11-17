"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the due diligence findings accurately reflect the checks carried out and the evidence available.";

type ReviewType = "" | "physical" | "virtual";
type YesNo = "" | "yes" | "no";
type YesNoDetails = "" | "yes" | "no" | "details";
type Adequacy = "" | "adequate" | "gaps";
type SiteSuitability = "" | "suitable" | "suitable_with_actions" | "unsuitable";
type Conclusion = "" | "verified" | "verified_with_conditions" | "not_verified";
type Recommendation = "" | "proceed" | "proceed_after_action" | "do_not_proceed";

type HostRecord = {
  hostOrganisationId: string;
  organisationName: string;
  country: string;
  industrySector: string;
  physicalAddress: string;
  publicWebsite: string;
  officialEmail: string;
  officialPhone: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
};

type FormState = {
  reviewType: ReviewType;
  reviewDate: string;
  reviewers: string;
  placementSiteAddress: string;
  companyRepresentatives: string;
  facilitiesAvailable: YesNoDetails;
  facilitiesAvailableDetails: string;
  laboratoriesDetails: string;
  softwareDetails: string;
  hseControls: Adequacy;
  hseControlsDetails: string;
  emergencyProcedures: Adequacy;
  emergencyProceduresDetails: string;
  accessibility: Adequacy;
  accessibilityDetails: string;
  supervisorAvailability: YesNo;
  overallSiteSuitability: SiteSuitability;
  findingsActions: string;
  legalRegistrationVerified: YesNoDetails;
  legalRegistrationMethod: string;
  officialContactsVerified: YesNo;
  physicalSiteVerified: YesNo;
  websiteReviewed: YesNo;
  supervisorIdentityVerified: YesNo;
  hseVerified: YesNo;
  facilitiesVerified: YesNo;
  hostingCapacityVerified: YesNo;
  discrepancies: string;
  unresolvedRisks: string;
  correctiveActions: string;
  conclusion: Conclusion;
  recommendation: Recommendation;
  verificationEvidenceAttached: boolean;
  verificationEvidenceFileName: string;
  reviewRecordAttached: boolean;
  reviewRecordFileName: string;
  photographsAttached: boolean;
  photographsFileName: string;
  meetingNotesAttached: boolean;
  meetingNotesFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_HOST: HostRecord = {
  hostOrganisationId: "",
  organisationName: "",
  country: "",
  industrySector: "",
  physicalAddress: "",
  publicWebsite: "",
  officialEmail: "",
  officialPhone: "",
  contactName: "",
  contactRole: "",
  contactEmail: "",
  contactPhone: "",
};

const EMPTY_FORM: FormState = {
  reviewType: "",
  reviewDate: "",
  reviewers: "",
  placementSiteAddress: "",
  companyRepresentatives: "",
  facilitiesAvailable: "",
  facilitiesAvailableDetails: "",
  laboratoriesDetails: "",
  softwareDetails: "",
  hseControls: "",
  hseControlsDetails: "",
  emergencyProcedures: "",
  emergencyProceduresDetails: "",
  accessibility: "",
  accessibilityDetails: "",
  supervisorAvailability: "",
  overallSiteSuitability: "",
  findingsActions: "",
  legalRegistrationVerified: "",
  legalRegistrationMethod: "",
  officialContactsVerified: "",
  physicalSiteVerified: "",
  websiteReviewed: "",
  supervisorIdentityVerified: "",
  hseVerified: "",
  facilitiesVerified: "",
  hostingCapacityVerified: "",
  discrepancies: "",
  unresolvedRisks: "",
  correctiveActions: "",
  conclusion: "",
  recommendation: "",
  verificationEvidenceAttached: false,
  verificationEvidenceFileName: "",
  reviewRecordAttached: false,
  reviewRecordFileName: "",
  photographsAttached: false,
  photographsFileName: "",
  meetingNotesAttached: false,
  meetingNotesFileName: "",
  declared: false,
  signature: "",
  signedAt: "",
};

function pending(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || text === "[pending]" || text === "—") return "Pending";
  return text;
}

function storageKey(applicationId: string): string {
  return `smecc2e.facilities-assessment-due-diligence.${applicationId}`;
}

export function FacilitiesAssessmentDueDiligenceForm({
  user,
  displayName,
}: {
  user: ApplicantSessionUser;
  displayName: string;
}) {
  const app = user.application;
  const applicationId = app?.id ?? user.email;
  const [host, setHost] = useState<HostRecord>(EMPTY_HOST);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const nominationRaw = localStorage.getItem(
        `smecc2e.organisation-identification-nomination.${applicationId}`
      );
      if (nominationRaw) {
        const nomination = JSON.parse(nominationRaw) as Partial<HostRecord>;
        setHost({
          hostOrganisationId: nomination.hostOrganisationId ?? "",
          organisationName: nomination.organisationName ?? "",
          country: nomination.country ?? "",
          industrySector: nomination.industrySector ?? "",
          physicalAddress: nomination.physicalAddress ?? "",
          publicWebsite: nomination.publicWebsite ?? "",
          officialEmail: nomination.officialEmail ?? "",
          officialPhone: nomination.officialPhone ?? "",
          contactName: nomination.contactName ?? "",
          contactRole: nomination.contactRole ?? "",
          contactEmail: nomination.contactEmail ?? "",
          contactPhone: nomination.contactPhone ?? "",
        });
      } else {
        setHost(EMPTY_HOST);
      }

      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm(EMPTY_FORM);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({ ...EMPTY_FORM, ...parsed });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setHost(EMPTY_HOST);
      setForm(EMPTY_FORM);
    }
  }, [applicationId]);

  const fullName = useMemo(() => {
    const parts = [app?.firstName, app?.middleName, app?.surname]
      .map((part) => part?.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : displayName;
  }, [app?.firstName, app?.middleName, app?.surname, displayName]);

  const update = (patch: Partial<FormState>) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      ...patch,
      signature: "",
      signedAt: "",
    }));
  };

  const sign = () => {
    if (saved) return;
    if (!form.reviewType) {
      setError("Select the review type.");
      return;
    }
    if (!form.reviewDate) {
      setError("Enter the review date.");
      return;
    }
    if (!form.reviewers.trim()) {
      setError("Enter the reviewer(s).");
      return;
    }
    if (!form.placementSiteAddress.trim()) {
      setError("Enter the placement site address.");
      return;
    }
    if (!form.facilitiesAvailable) {
      setError("Indicate whether relevant facilities / equipment are available.");
      return;
    }
    if (
      form.facilitiesAvailable === "details" &&
      !form.facilitiesAvailableDetails.trim()
    ) {
      setError("Provide facilities / equipment details.");
      return;
    }
    if (!form.laboratoriesDetails.trim()) {
      setError("Provide laboratories / workshops / plants / offices / field sites details.");
      return;
    }
    if (!form.softwareDetails.trim()) {
      setError("Provide software / digital infrastructure details.");
      return;
    }
    if (!form.hseControls) {
      setError("Assess HSE controls and signage.");
      return;
    }
    if (form.hseControls === "gaps" && !form.hseControlsDetails.trim()) {
      setError("Describe HSE gaps.");
      return;
    }
    if (!form.emergencyProcedures) {
      setError("Assess emergency procedures / contacts.");
      return;
    }
    if (
      form.emergencyProcedures === "gaps" &&
      !form.emergencyProceduresDetails.trim()
    ) {
      setError("Describe emergency procedure gaps.");
      return;
    }
    if (!form.accessibility) {
      setError("Assess accessibility / reasonable accommodation.");
      return;
    }
    if (form.accessibility === "gaps" && !form.accessibilityDetails.trim()) {
      setError("Describe accessibility gaps.");
      return;
    }
    if (!form.supervisorAvailability) {
      setError("Indicate whether supervisor availability is confirmed.");
      return;
    }
    if (!form.overallSiteSuitability) {
      setError("Select overall site suitability.");
      return;
    }
    if (!form.findingsActions.trim()) {
      setError("Enter findings / actions.");
      return;
    }
    if (!form.legalRegistrationVerified) {
      setError("Indicate whether legal registration was independently verified.");
      return;
    }
    if (
      form.legalRegistrationVerified === "details" &&
      !form.legalRegistrationMethod.trim()
    ) {
      setError("Describe the legal registration verification method.");
      return;
    }
    const verificationFields: [keyof FormState, string][] = [
      ["officialContactsVerified", "official contacts verified"],
      ["physicalSiteVerified", "physical placement site verified"],
      ["websiteReviewed", "website / public information reviewed"],
      ["supervisorIdentityVerified", "workplace supervisor identity / role verified"],
      ["hseVerified", "HSE arrangements verified"],
      ["facilitiesVerified", "facilities / equipment verified"],
      ["hostingCapacityVerified", "hosting capacity verified"],
    ];
    for (const [key, label] of verificationFields) {
      if (!form[key]) {
        setError(`Indicate whether ${label}.`);
        return;
      }
    }
    if (!form.conclusion) {
      setError("Select the due diligence conclusion.");
      return;
    }
    if (!form.recommendation) {
      setError("Select the recommendation to consortium.");
      return;
    }
    if (
      !form.verificationEvidenceAttached ||
      !form.verificationEvidenceFileName
    ) {
      setError("Attach verification evidence.");
      return;
    }
    if (!form.declared) {
      setError("Confirm the declaration before submitting.");
      return;
    }
    const signedAt = new Date().toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const next = { ...form, signature: fullName, signedAt };
    setForm(next);
    setSaved(true);
    setError(null);
    try {
      localStorage.setItem(storageKey(applicationId), JSON.stringify(next));
    } catch {
      setError(
        "The form was signed in this session, but it could not be stored in this browser."
      );
    }
  };

  return (
    <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header>
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <Image
            src="/images/letter-header.jpg"
            alt="SMECC2E Cross Regional Intra-Africa Mobility Project, African Union, Co-funded by the European Union"
            width={1024}
            height={157}
            priority
            className="h-auto w-full"
          />
        </div>
        <div className="bg-[#062763] px-6 py-5 text-white">
          <p className="text-[11px] font-semibold leading-5 text-white/80">
            {GRANT_LINE}
          </p>
          <h1 className="mt-3 text-lg font-bold tracking-wide sm:text-xl">
            Facilities assessment &amp; due diligence verification form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Host-country SMECC2E Partner
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <p>
            <span className="font-bold text-[#062763]">Purpose. </span>
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Document a physical or virtual review of the proposed placement
              site where further verification is required.
            </li>
            <li>
              Verify the information supplied by the proposed host and its
              practical suitability before consortium approval.
            </li>
          </ul>
          <p className="mt-2">
            Host-country Focal Person sign-off remains Pending until completed by
            authorised staff.
          </p>
        </div>

        <FormTable title="Host organisation record">
          <ReadRow
            label="Host Organisation ID"
            value={pending(host.hostOrganisationId)}
          />
          <ReadRow
            label="Organisation name"
            value={pending(host.organisationName)}
          />
          <ReadRow label="Country" value={pending(host.country)} />
          <ReadRow
            label="Industry / sector"
            value={pending(host.industrySector)}
          />
          <ReadRow
            label="Physical address"
            value={pending(host.physicalAddress)}
          />
          <ReadRow
            label="Public website / URL"
            value={pending(host.publicWebsite)}
          />
          <ReadRow label="Official email" value={pending(host.officialEmail)} />
          <ReadRow label="Official phone" value={pending(host.officialPhone)} />
          <ReadRow
            label="Primary contact — name"
            value={pending(host.contactName)}
          />
          <ReadRow
            label="Primary contact — role"
            value={pending(host.contactRole)}
          />
          <ReadRow
            label="Primary contact — email"
            value={pending(host.contactEmail)}
          />
          <ReadRow
            label="Primary contact — phone"
            value={pending(host.contactPhone)}
          />
        </FormTable>

        <FormTable title="Visit details">
          <ChoiceRow label="Review type">
            <RadioGroup
              name="fadd-review-type"
              value={form.reviewType}
              disabled={saved}
              onChange={(reviewType) =>
                update({ reviewType: reviewType as ReviewType })
              }
              options={[
                ["physical", "Physical Site Visit"],
                ["virtual", "Virtual Facilities Review"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Date"
            type="date"
            value={form.reviewDate}
            disabled={saved}
            onChange={(reviewDate) => update({ reviewDate })}
          />
          <TextRow
            label="Reviewer(s)"
            value={form.reviewers}
            disabled={saved}
            onChange={(reviewers) => update({ reviewers })}
          />
          <TextRow
            label="Placement site address"
            value={form.placementSiteAddress}
            disabled={saved}
            multiline
            rows={2}
            onChange={(placementSiteAddress) =>
              update({ placementSiteAddress })
            }
          />
          <TextRow
            label="Company representatives present"
            value={form.companyRepresentatives}
            disabled={saved}
            multiline
            rows={2}
            onChange={(companyRepresentatives) =>
              update({ companyRepresentatives })
            }
          />
        </FormTable>

        <FormTable title="Facilities & workplace review">
          <ChoiceRow label="Relevant facilities / equipment available">
            <div className="space-y-2">
              <RadioGroup
                name="fadd-facilities"
                value={form.facilitiesAvailable}
                disabled={saved}
                onChange={(facilitiesAvailable) =>
                  update({
                    facilitiesAvailable: facilitiesAvailable as YesNoDetails,
                    facilitiesAvailableDetails:
                      facilitiesAvailable === "details"
                        ? form.facilitiesAvailableDetails
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["details", "Details"],
                ]}
              />
              {form.facilitiesAvailable === "details" && (
                <textarea
                  value={form.facilitiesAvailableDetails}
                  disabled={saved}
                  rows={2}
                  onChange={(event) =>
                    update({ facilitiesAvailableDetails: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="Laboratories / workshops / plants / offices / field sites"
            value={form.laboratoriesDetails}
            disabled={saved}
            multiline
            rows={3}
            onChange={(laboratoriesDetails) => update({ laboratoriesDetails })}
          />
          <TextRow
            label="Software / digital infrastructure"
            value={form.softwareDetails}
            disabled={saved}
            multiline
            rows={3}
            onChange={(softwareDetails) => update({ softwareDetails })}
          />
          <AdequacyRow
            label="HSE controls and signage"
            name="fadd-hse"
            value={form.hseControls}
            details={form.hseControlsDetails}
            disabled={saved}
            onChange={(hseControls) =>
              update({
                hseControls,
                hseControlsDetails:
                  hseControls === "gaps" ? form.hseControlsDetails : "",
              })
            }
            onDetailsChange={(hseControlsDetails) =>
              update({ hseControlsDetails })
            }
          />
          <AdequacyRow
            label="Emergency procedures / contacts"
            name="fadd-emergency"
            value={form.emergencyProcedures}
            details={form.emergencyProceduresDetails}
            disabled={saved}
            onChange={(emergencyProcedures) =>
              update({
                emergencyProcedures,
                emergencyProceduresDetails:
                  emergencyProcedures === "gaps"
                    ? form.emergencyProceduresDetails
                    : "",
              })
            }
            onDetailsChange={(emergencyProceduresDetails) =>
              update({ emergencyProceduresDetails })
            }
          />
          <AdequacyRow
            label="Accessibility / reasonable accommodation"
            name="fadd-access"
            value={form.accessibility}
            details={form.accessibilityDetails}
            disabled={saved}
            onChange={(accessibility) =>
              update({
                accessibility,
                accessibilityDetails:
                  accessibility === "gaps" ? form.accessibilityDetails : "",
              })
            }
            onDetailsChange={(accessibilityDetails) =>
              update({ accessibilityDetails })
            }
          />
          <ChoiceRow label="Supervisor availability confirmed">
            <RadioGroup
              name="fadd-supervisor"
              value={form.supervisorAvailability}
              disabled={saved}
              onChange={(supervisorAvailability) =>
                update({
                  supervisorAvailability: supervisorAvailability as YesNo,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Overall site suitability">
            <RadioGroup
              name="fadd-suitability"
              value={form.overallSiteSuitability}
              disabled={saved}
              onChange={(overallSiteSuitability) =>
                update({
                  overallSiteSuitability:
                    overallSiteSuitability as SiteSuitability,
                })
              }
              options={[
                ["suitable", "Suitable"],
                ["suitable_with_actions", "Suitable with Actions"],
                ["unsuitable", "Unsuitable"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Findings / actions"
            value={form.findingsActions}
            disabled={saved}
            multiline
            rows={4}
            onChange={(findingsActions) => update({ findingsActions })}
          />
        </FormTable>

        <FormTable title="Verification checks">
          <ChoiceRow label="Legal registration independently verified">
            <div className="space-y-2">
              <RadioGroup
                name="fadd-legal"
                value={form.legalRegistrationVerified}
                disabled={saved}
                onChange={(legalRegistrationVerified) =>
                  update({
                    legalRegistrationVerified:
                      legalRegistrationVerified as YesNoDetails,
                    legalRegistrationMethod:
                      legalRegistrationVerified === "details"
                        ? form.legalRegistrationMethod
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["details", "Method"],
                ]}
              />
              {form.legalRegistrationVerified === "details" && (
                <input
                  type="text"
                  value={form.legalRegistrationMethod}
                  disabled={saved}
                  placeholder="Verification method"
                  onChange={(event) =>
                    update({ legalRegistrationMethod: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <YesNoRow
            label="Official contacts verified"
            name="fadd-contacts"
            value={form.officialContactsVerified}
            disabled={saved}
            onChange={(officialContactsVerified) =>
              update({ officialContactsVerified })
            }
          />
          <YesNoRow
            label="Physical placement site verified"
            name="fadd-site"
            value={form.physicalSiteVerified}
            disabled={saved}
            onChange={(physicalSiteVerified) =>
              update({ physicalSiteVerified })
            }
          />
          <YesNoRow
            label="Website / public information reviewed"
            name="fadd-website"
            value={form.websiteReviewed}
            disabled={saved}
            onChange={(websiteReviewed) => update({ websiteReviewed })}
          />
          <YesNoRow
            label="Workplace supervisor identity / role verified"
            name="fadd-supervisor-id"
            value={form.supervisorIdentityVerified}
            disabled={saved}
            onChange={(supervisorIdentityVerified) =>
              update({ supervisorIdentityVerified })
            }
          />
          <YesNoRow
            label="HSE arrangements verified"
            name="fadd-hse-verified"
            value={form.hseVerified}
            disabled={saved}
            onChange={(hseVerified) => update({ hseVerified })}
          />
          <YesNoRow
            label="Facilities / equipment verified"
            name="fadd-facilities-verified"
            value={form.facilitiesVerified}
            disabled={saved}
            onChange={(facilitiesVerified) => update({ facilitiesVerified })}
          />
          <YesNoRow
            label="Hosting capacity verified"
            name="fadd-capacity"
            value={form.hostingCapacityVerified}
            disabled={saved}
            onChange={(hostingCapacityVerified) =>
              update({ hostingCapacityVerified })
            }
          />
          <TextRow
            label="Discrepancies identified"
            value={form.discrepancies}
            disabled={saved}
            multiline
            rows={3}
            onChange={(discrepancies) => update({ discrepancies })}
          />
          <TextRow
            label="Unresolved risks"
            value={form.unresolvedRisks}
            disabled={saved}
            multiline
            rows={3}
            onChange={(unresolvedRisks) => update({ unresolvedRisks })}
          />
          <TextRow
            label="Corrective actions required"
            value={form.correctiveActions}
            disabled={saved}
            multiline
            rows={3}
            onChange={(correctiveActions) => update({ correctiveActions })}
          />
        </FormTable>

        <FormTable title="Due diligence conclusion">
          <ChoiceRow label="Conclusion">
            <RadioGroup
              name="fadd-conclusion"
              value={form.conclusion}
              disabled={saved}
              onChange={(conclusion) =>
                update({ conclusion: conclusion as Conclusion })
              }
              options={[
                ["verified", "Verified"],
                ["verified_with_conditions", "Verified with Conditions"],
                ["not_verified", "Not Verified"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Recommendation to consortium">
            <RadioGroup
              name="fadd-recommendation"
              value={form.recommendation}
              disabled={saved}
              onChange={(recommendation) =>
                update({ recommendation: recommendation as Recommendation })
              }
              options={[
                ["proceed", "Proceed"],
                ["proceed_after_action", "Proceed after action"],
                ["do_not_proceed", "Do not proceed"],
              ]}
            />
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (upload)
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Verification evidence"
              checked={form.verificationEvidenceAttached}
              fileName={form.verificationEvidenceFileName}
              disabled={saved}
              onCheckedChange={(verificationEvidenceAttached) =>
                update({
                  verificationEvidenceAttached,
                  verificationEvidenceFileName: verificationEvidenceAttached
                    ? form.verificationEvidenceFileName
                    : "",
                })
              }
              onFileNameChange={(verificationEvidenceFileName) =>
                update({
                  verificationEvidenceAttached: true,
                  verificationEvidenceFileName,
                })
              }
            />
            <AttachmentRow
              label="Site / virtual review record where applicable"
              checked={form.reviewRecordAttached}
              fileName={form.reviewRecordFileName}
              disabled={saved}
              onCheckedChange={(reviewRecordAttached) =>
                update({
                  reviewRecordAttached,
                  reviewRecordFileName: reviewRecordAttached
                    ? form.reviewRecordFileName
                    : "",
                })
              }
              onFileNameChange={(reviewRecordFileName) =>
                update({ reviewRecordAttached: true, reviewRecordFileName })
              }
            />
            <AttachmentRow
              label="Photographs or review evidence where authorised"
              checked={form.photographsAttached}
              fileName={form.photographsFileName}
              disabled={saved}
              onCheckedChange={(photographsAttached) =>
                update({
                  photographsAttached,
                  photographsFileName: photographsAttached
                    ? form.photographsFileName
                    : "",
                })
              }
              onFileNameChange={(photographsFileName) =>
                update({ photographsAttached: true, photographsFileName })
              }
            />
            <AttachmentRow
              label="Meeting notes"
              checked={form.meetingNotesAttached}
              fileName={form.meetingNotesFileName}
              disabled={saved}
              onCheckedChange={(meetingNotesAttached) =>
                update({
                  meetingNotesAttached,
                  meetingNotesFileName: meetingNotesAttached
                    ? form.meetingNotesFileName
                    : "",
                })
              }
              onFileNameChange={(meetingNotesFileName) =>
                update({ meetingNotesAttached: true, meetingNotesFileName })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Declaration / commitment
          </h2>
          <label className="mt-3 flex items-start gap-3 px-1 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={form.declared}
              disabled={saved}
              onChange={(event) => update({ declared: event.target.checked })}
              className="mt-1"
            />
            <span>{DECLARATION}</span>
          </label>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Host-country Focal Person",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Scholar acknowledgement",
              name: fullName,
              signature: form.signature || "Awaiting acknowledgement",
              date: form.signedAt || "Awaiting acknowledgement",
            },
          ]}
        />

        <SignTable
          title="Viewable by"
          rows={[
            {
              role: "SMECC2E Coordinator",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        {error && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            Due diligence acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved
            ? "Due diligence acknowledged"
            : "Acknowledge due diligence findings"}
        </button>
      </div>
      <footer className="border-t border-slate-200 bg-white px-6 py-4">
        <Image
          src="/images/letter-footer.png"
          alt="Implemented by the SMECC2E partner universities — https://smecc2e.unn.edu.ng/"
          width={411}
          height={109}
          className="h-auto w-full max-w-102.75"
        />
      </footer>
    </article>
  );
}

function FormTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
          {title}
        </caption>
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <th className="w-[42%] border border-slate-300 px-3 py-2">
              Field / item
            </th>
            <th className="border border-slate-300 px-3 py-2">Entry</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
        {value}
      </td>
    </tr>
  );
}

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2">{children}</td>
    </tr>
  );
}

function TextRow({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <ChoiceRow label={label}>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
      ) : (
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
      )}
    </ChoiceRow>
  );
}

function YesNoRow({
  label,
  name,
  value,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: YesNo;
  disabled: boolean;
  onChange: (value: YesNo) => void;
}) {
  return (
    <ChoiceRow label={label}>
      <RadioGroup
        name={name}
        value={value}
        disabled={disabled}
        onChange={(next) => onChange(next as YesNo)}
        options={[
          ["yes", "Yes"],
          ["no", "No"],
        ]}
      />
    </ChoiceRow>
  );
}

function AdequacyRow({
  label,
  name,
  value,
  details,
  disabled,
  onChange,
  onDetailsChange,
}: {
  label: string;
  name: string;
  value: Adequacy;
  details: string;
  disabled: boolean;
  onChange: (value: Adequacy) => void;
  onDetailsChange: (value: string) => void;
}) {
  return (
    <ChoiceRow label={label}>
      <div className="space-y-2">
        <RadioGroup
          name={name}
          value={value}
          disabled={disabled}
          onChange={(next) => onChange(next as Adequacy)}
          options={[
            ["adequate", "Adequate"],
            ["gaps", "Gaps"],
          ]}
        />
        {value === "gaps" && (
          <textarea
            value={details}
            disabled={disabled}
            rows={2}
            placeholder="Describe gaps"
            onChange={(event) => onDetailsChange(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
          />
        )}
      </div>
    </ChoiceRow>
  );
}

function RadioGroup({
  name,
  value,
  options,
  onChange,
  disabled = false,
}: {
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map(([optionValue, label]) => (
        <label
          key={optionValue}
          className="inline-flex items-center gap-2 text-sm text-slate-800"
        >
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={value === optionValue}
            disabled={disabled}
            onChange={() => onChange(optionValue)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function AttachmentRow({
  label,
  checked,
  fileName,
  disabled,
  onCheckedChange,
  onFileNameChange,
}: {
  label: string;
  checked: boolean;
  fileName: string;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  onFileNameChange: (fileName: string) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-1"
      />
      <span>
        {label}
        {checked && (
          <input
            type="file"
            disabled={disabled}
            className="mt-2 block w-full text-sm"
            onChange={(event) =>
              onFileNameChange(event.target.files?.[0]?.name ?? "")
            }
          />
        )}
        {fileName && (
          <span className="mt-1 block font-semibold text-[#062763]">
            {fileName}
          </span>
        )}
      </span>
    </label>
  );
}

function SignTable({
  title,
  rows,
}: {
  title: string;
  rows: { role: string; name: string; signature: string; date: string }[];
}) {
  return (
    <section className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
          {title}
        </caption>
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <th className="border border-slate-300 px-3 py-2">Role</th>
            <th className="border border-slate-300 px-3 py-2">Name</th>
            <th className="border border-slate-300 px-3 py-2">
              Decision / signature
            </th>
            <th className="border border-slate-300 px-3 py-2">
              Date / timestamp
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.role}`}>
              <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
                {row.role}
              </th>
              <td className="border border-slate-300 px-3 py-2">{row.name}</td>
              <td className="border border-slate-300 px-3 py-2">
                {row.signature}
              </td>
              <td className="border border-slate-300 px-3 py-2">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
