"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION_DECISION =
  "The recorded decision reflects the consortium consideration of mandatory compliance, technical quality, due diligence and any required conditions.";

const DECLARATION_REGISTER =
  "This host register entry reflects the approved site, capacity and conditions.";

const THEMATIC_OPTIONS = [
  ["sustainable_energy", "Sustainable Energy"],
  ["sustainable_materials", "Sustainable Materials"],
  ["climate_change", "Climate Change"],
  ["energy_economics", "Energy Economics"],
  ["energy_policy", "Energy Policy"],
  ["environment", "Environment"],
] as const;

const GATEWAY_OPTIONS = [
  ["climate_and_energy", "Climate and Energy"],
  ["transport", "Transport"],
  ["education_and_research", "Education and Research"],
  ["digital", "Digital"],
] as const;

type ThematicKey = (typeof THEMATIC_OPTIONS)[number][0];
type GatewayKey = (typeof GATEWAY_OPTIONS)[number][0];
type Decision =
  | ""
  | "approved"
  | "approved_with_conditions"
  | "deferred"
  | "rejected";
type PlacementType =
  | ""
  | "internship"
  | "traineeship"
  | "internship_and_traineeship";
type CurrentStatus =
  | ""
  | "active"
  | "conditional"
  | "suspended"
  | "withdrawn"
  | "expired";

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
  decision: Decision;
  conditionsBeforePlacement: string;
  approvalValidityDate: string;
  reasonForDecision: string;
  consortiumApprovalReference: boolean;
  approvalDate: string;
  approvedPlacementType: PlacementType;
  approvedParticipantCapacity: string;
  thematicAreas: ThematicKey[];
  gatewayPriorities: GatewayKey[];
  workplaceSupervisors: string;
  partnerHeiLiaison: string;
  conditionsOfApproval: string;
  reviewExpiryDate: string;
  currentStatus: CurrentStatus;
  eligibilityAttached: boolean;
  eligibilityFileName: string;
  technicalAttached: boolean;
  technicalFileName: string;
  dueDiligenceAttached: boolean;
  dueDiligenceFileName: string;
  mouAttached: boolean;
  mouFileName: string;
  declaredDecision: boolean;
  declaredRegister: boolean;
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
  decision: "",
  conditionsBeforePlacement: "",
  approvalValidityDate: "",
  reasonForDecision: "",
  consortiumApprovalReference: false,
  approvalDate: "",
  approvedPlacementType: "",
  approvedParticipantCapacity: "",
  thematicAreas: [],
  gatewayPriorities: [],
  workplaceSupervisors: "",
  partnerHeiLiaison: "",
  conditionsOfApproval: "",
  reviewExpiryDate: "",
  currentStatus: "",
  eligibilityAttached: false,
  eligibilityFileName: "",
  technicalAttached: false,
  technicalFileName: "",
  dueDiligenceAttached: false,
  dueDiligenceFileName: "",
  mouAttached: false,
  mouFileName: "",
  declaredDecision: false,
  declaredRegister: false,
  signature: "",
  signedAt: "",
};

function pending(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || text === "[pending]" || text === "—") return "Pending";
  return text;
}

function toggleListValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function storageKey(applicationId: string): string {
  return `smecc2e.consortium-host-approval-registration.${applicationId}`;
}

export function ConsortiumHostApprovalRegistrationForm({
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
      let thematicPrefill: ThematicKey[] = [];
      let gatewayPrefill: GatewayKey[] = [];
      if (nominationRaw) {
        const nomination = JSON.parse(nominationRaw) as Partial<HostRecord> & {
          thematicAreas?: ThematicKey[];
          gatewayPriorities?: GatewayKey[];
        };
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
        thematicPrefill = nomination.thematicAreas ?? [];
        gatewayPrefill = nomination.gatewayPriorities ?? [];
      } else {
        setHost(EMPTY_HOST);
      }

      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({
          ...EMPTY_FORM,
          thematicAreas: thematicPrefill,
          gatewayPriorities: gatewayPrefill,
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        thematicAreas: parsed.thematicAreas ?? thematicPrefill,
        gatewayPriorities: parsed.gatewayPriorities ?? gatewayPrefill,
      });
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
    if (!form.decision) {
      setError("Select the consortium decision.");
      return;
    }
    if (
      form.decision === "approved_with_conditions" &&
      !form.conditionsBeforePlacement.trim()
    ) {
      setError("Enter conditions before placement.");
      return;
    }
    if (!form.approvalValidityDate) {
      setError("Enter the approval validity / review date.");
      return;
    }
    if (!form.reasonForDecision.trim()) {
      setError("Enter the reason for the decision.");
      return;
    }
    if (!form.consortiumApprovalReference) {
      setError("Confirm the consortium approval reference.");
      return;
    }
    if (!form.approvalDate) {
      setError("Enter the approval date.");
      return;
    }
    if (!form.approvedPlacementType) {
      setError("Select the approved placement type.");
      return;
    }
    if (!form.approvedParticipantCapacity.trim()) {
      setError("Enter the approved participant capacity.");
      return;
    }
    if (form.thematicAreas.length === 0) {
      setError("Select at least one approved thematic area.");
      return;
    }
    if (form.gatewayPriorities.length === 0) {
      setError("Select at least one Global Gateway priority.");
      return;
    }
    if (!form.workplaceSupervisors.trim()) {
      setError("Enter the named workplace supervisor(s).");
      return;
    }
    if (!form.partnerHeiLiaison.trim()) {
      setError("Enter the Partner HEI liaison.");
      return;
    }
    if (!form.reviewExpiryDate) {
      setError("Enter the review / expiry date.");
      return;
    }
    if (!form.currentStatus) {
      setError("Select the current status.");
      return;
    }
    if (!form.eligibilityAttached || !form.eligibilityFileName) {
      setError("Attach the eligibility screening.");
      return;
    }
    if (!form.technicalAttached || !form.technicalFileName) {
      setError("Attach the technical assessment.");
      return;
    }
    if (!form.dueDiligenceAttached || !form.dueDiligenceFileName) {
      setError("Attach the due diligence record.");
      return;
    }
    if (!form.declaredDecision || !form.declaredRegister) {
      setError("Confirm both declarations before submitting.");
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
            Consortium approval &amp; approved host registration form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Coordinator / Partner HEI
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Create or update the official approved-host record after consortium
          approval. Partner HEI Focal Person and SMECC2E Coordinator sign-off
          remain Pending until completed by authorised staff.
        </p>

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

        <FormTable title="Consortium decision">
          <ChoiceRow label="Decision">
            <RadioGroup
              name="char-decision"
              value={form.decision}
              disabled={saved}
              onChange={(decision) =>
                update({
                  decision: decision as Decision,
                  conditionsBeforePlacement:
                    decision === "approved_with_conditions"
                      ? form.conditionsBeforePlacement
                      : "",
                })
              }
              options={[
                ["approved", "Approved"],
                ["approved_with_conditions", "Approved with Conditions"],
                ["deferred", "Deferred"],
                ["rejected", "Rejected"],
              ]}
            />
          </ChoiceRow>
          {(form.decision === "approved_with_conditions" ||
            form.conditionsBeforePlacement) && (
            <TextRow
              label="Conditions before placement"
              value={form.conditionsBeforePlacement}
              disabled={saved}
              multiline
              rows={4}
              onChange={(conditionsBeforePlacement) =>
                update({ conditionsBeforePlacement })
              }
            />
          )}
          <TextRow
            label="Approval validity / review date"
            type="date"
            value={form.approvalValidityDate}
            disabled={saved}
            onChange={(approvalValidityDate) =>
              update({ approvalValidityDate })
            }
          />
          <TextRow
            label="Reason for decision"
            value={form.reasonForDecision}
            disabled={saved}
            multiline
            rows={4}
            onChange={(reasonForDecision) => update({ reasonForDecision })}
          />
        </FormTable>

        <FormTable title="Approved host register">
          <ChoiceRow label="Consortium approval reference">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={form.consortiumApprovalReference}
                disabled={saved}
                onChange={(event) =>
                  update({
                    consortiumApprovalReference: event.target.checked,
                  })
                }
              />
              Yes — consortium approval reference recorded
            </label>
          </ChoiceRow>
          <TextRow
            label="Approval date"
            type="date"
            value={form.approvalDate}
            disabled={saved}
            onChange={(approvalDate) => update({ approvalDate })}
          />
          <ChoiceRow label="Approved placement type">
            <RadioGroup
              name="char-placement"
              value={form.approvedPlacementType}
              disabled={saved}
              onChange={(approvedPlacementType) =>
                update({
                  approvedPlacementType: approvedPlacementType as PlacementType,
                })
              }
              options={[
                ["internship", "Internship"],
                ["traineeship", "Traineeship"],
                ["internship_and_traineeship", "Internship & Traineeship"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Approved participant capacity"
            value={form.approvedParticipantCapacity}
            disabled={saved}
            onChange={(approvedParticipantCapacity) =>
              update({ approvedParticipantCapacity })
            }
          />
          <ChoiceRow label="Approved thematic area(s)">
            <CheckboxGroup
              options={[...THEMATIC_OPTIONS]}
              values={form.thematicAreas}
              disabled={saved}
              onChange={(thematicAreas) =>
                update({ thematicAreas: thematicAreas as ThematicKey[] })
              }
            />
          </ChoiceRow>
          <ChoiceRow label="Relevant Global Gateway Priorities covered">
            <CheckboxGroup
              options={[...GATEWAY_OPTIONS]}
              values={form.gatewayPriorities}
              disabled={saved}
              onChange={(gatewayPriorities) =>
                update({ gatewayPriorities: gatewayPriorities as GatewayKey[] })
              }
            />
          </ChoiceRow>
          <TextRow
            label="Named workplace supervisor(s)"
            value={form.workplaceSupervisors}
            disabled={saved}
            multiline
            rows={2}
            onChange={(workplaceSupervisors) =>
              update({ workplaceSupervisors })
            }
          />
          <TextRow
            label="Partner HEI liaison"
            value={form.partnerHeiLiaison}
            disabled={saved}
            onChange={(partnerHeiLiaison) => update({ partnerHeiLiaison })}
          />
          <TextRow
            label="Conditions of approval"
            value={form.conditionsOfApproval}
            disabled={saved}
            multiline
            rows={3}
            onChange={(conditionsOfApproval) =>
              update({ conditionsOfApproval })
            }
          />
          <TextRow
            label="Review / expiry date"
            type="date"
            value={form.reviewExpiryDate}
            disabled={saved}
            onChange={(reviewExpiryDate) => update({ reviewExpiryDate })}
          />
          <ChoiceRow label="Current status">
            <RadioGroup
              name="char-status"
              value={form.currentStatus}
              disabled={saved}
              onChange={(currentStatus) =>
                update({ currentStatus: currentStatus as CurrentStatus })
              }
              options={[
                ["active", "Active"],
                ["conditional", "Conditional"],
                ["suspended", "Suspended"],
                ["withdrawn", "Withdrawn"],
                ["expired", "Expired"],
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
              label="Eligibility screening"
              checked={form.eligibilityAttached}
              fileName={form.eligibilityFileName}
              disabled={saved}
              onCheckedChange={(eligibilityAttached) =>
                update({
                  eligibilityAttached,
                  eligibilityFileName: eligibilityAttached
                    ? form.eligibilityFileName
                    : "",
                })
              }
              onFileNameChange={(eligibilityFileName) =>
                update({ eligibilityAttached: true, eligibilityFileName })
              }
            />
            <AttachmentRow
              label="Technical assessment"
              checked={form.technicalAttached}
              fileName={form.technicalFileName}
              disabled={saved}
              onCheckedChange={(technicalAttached) =>
                update({
                  technicalAttached,
                  technicalFileName: technicalAttached
                    ? form.technicalFileName
                    : "",
                })
              }
              onFileNameChange={(technicalFileName) =>
                update({ technicalAttached: true, technicalFileName })
              }
            />
            <AttachmentRow
              label="Due diligence record"
              checked={form.dueDiligenceAttached}
              fileName={form.dueDiligenceFileName}
              disabled={saved}
              onCheckedChange={(dueDiligenceAttached) =>
                update({
                  dueDiligenceAttached,
                  dueDiligenceFileName: dueDiligenceAttached
                    ? form.dueDiligenceFileName
                    : "",
                })
              }
              onFileNameChange={(dueDiligenceFileName) =>
                update({ dueDiligenceAttached: true, dueDiligenceFileName })
              }
            />
            <AttachmentRow
              label="Signed MOU when available"
              checked={form.mouAttached}
              fileName={form.mouFileName}
              disabled={saved}
              onCheckedChange={(mouAttached) =>
                update({
                  mouAttached,
                  mouFileName: mouAttached ? form.mouFileName : "",
                })
              }
              onFileNameChange={(mouFileName) =>
                update({ mouAttached: true, mouFileName })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Declaration / commitment
          </h2>
          <div className="mt-3 space-y-3 px-1 text-sm leading-6 text-slate-700">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declaredDecision}
                disabled={saved}
                onChange={(event) =>
                  update({ declaredDecision: event.target.checked })
                }
                className="mt-1"
              />
              <span>{DECLARATION_DECISION}</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declaredRegister}
                disabled={saved}
                onChange={(event) =>
                  update({ declaredRegister: event.target.checked })
                }
                className="mt-1"
              />
              <span>{DECLARATION_REGISTER}</span>
            </label>
          </div>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Partner HEI Focal Person",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "SMECC2E Coordinator",
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
          title="Viewable and downloadable by"
          rows={[
            {
              role: "Quality Assurance Officer",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Work Supervisor",
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
            Host approval / registration acknowledged
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
            ? "Registration acknowledged"
            : "Acknowledge host registration"}
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

function RadioGroup({
  name,
  value,
  options,
  onChange,
  disabled = false,
}: {
  name: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
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

function CheckboxGroup({
  options,
  values,
  onChange,
  disabled = false,
}: {
  options: readonly (readonly [string, string])[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(([optionValue, label]) => (
        <label
          key={optionValue}
          className="inline-flex items-center gap-2 text-sm text-slate-800"
        >
          <input
            type="checkbox"
            checked={values.includes(optionValue)}
            disabled={disabled}
            onChange={() => onChange(toggleListValue(values, optionValue))}
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
