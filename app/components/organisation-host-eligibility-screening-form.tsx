"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "We jointly confirm that the screening result reflects the evidence reviewed and that no failed mandatory requirement has been disregarded.";

const THEMATIC_OPTIONS = [
  ["sustainable_energy", "Sustainable Energy"],
  ["sustainable_materials", "Sustainable Materials"],
  ["climate_change", "Climate Change"],
  ["energy_economics", "Energy Economics"],
  ["energy_policy", "Energy Policy"],
  ["environment", "Environment"],
] as const;

type ThematicKey = (typeof THEMATIC_OPTIONS)[number][0];
type EligibilityOutcome = "" | "eligible" | "ineligible" | "pending_clarification";

type ScreeningKey =
  | "legallyRegistered"
  | "thematicRelevance"
  | "industryExposure"
  | "workPlan"
  | "workplaceSupervisor"
  | "facilities"
  | "hseWelfare"
  | "nonDiscrimination"
  | "noMisconduct"
  | "monitoringWillingness"
  | "learningRelevance"
  | "noDisplacement"
  | "confidentialityIp"
  | "hostingCapacity"
  | "verifiableContacts"
  | "willingnessMou"
  | "willingnessPlacementAgreement";

type FormState = {
  organisationName: string;
  country: string;
  industrySector: string;
  physicalAddress: string;
  publicWebsite: string;
  officialEmailPhone: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  hostOrganisationId: string;
  screening: Record<ScreeningKey, string>;
  legallyRegisteredEvidence: string;
  thematicAreas: ThematicKey[];
  missingInformation: string;
  eligibilityOutcome: EligibilityOutcome;
  reasonForOutcome: string;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const SCREENING_FIELDS: {
  key: ScreeningKey;
  label: string;
  kind: "yes_no" | "yes_no_cant" | "yes_no_evidence" | "yes_no_na" | "thematic";
}[] = [
  {
    key: "legallyRegistered",
    label: "Legally registered and operating in host country",
    kind: "yes_no_evidence",
  },
  {
    key: "thematicRelevance",
    label: "Relevant to one or more SMECC2E thematic areas",
    kind: "thematic",
  },
  {
    key: "industryExposure",
    label: "Genuine relevant industry / professional exposure",
    kind: "yes_no_cant",
  },
  {
    key: "workPlan",
    label: "Defined placement / work plan available or can be completed",
    kind: "yes_no_cant",
  },
  {
    key: "workplaceSupervisor",
    label: "Qualified workplace supervisor available",
    kind: "yes_no_cant",
  },
  {
    key: "facilities",
    label: "Appropriate facilities / equipment / infrastructure",
    kind: "yes_no_cant",
  },
  {
    key: "hseWelfare",
    label: "Adequate HSE and welfare arrangements",
    kind: "yes_no_cant",
  },
  {
    key: "nonDiscrimination",
    label: "Non-discrimination and inclusion commitment",
    kind: "yes_no_cant",
  },
  {
    key: "noMisconduct",
    label: "No known serious ethical / professional misconduct",
    kind: "yes_no_cant",
  },
  {
    key: "monitoringWillingness",
    label: "Willingness to monitoring / reporting",
    kind: "yes_no_cant",
  },
  {
    key: "learningRelevance",
    label: "Learning relevance demonstrated",
    kind: "yes_no_cant",
  },
  {
    key: "noDisplacement",
    label: "No displacement of regular employment",
    kind: "yes_no_cant",
  },
  {
    key: "confidentialityIp",
    label: "Confidentiality / IP arrangements where relevant",
    kind: "yes_no_na",
  },
  {
    key: "hostingCapacity",
    label: "Capacity to host proposed participant numbers",
    kind: "yes_no_cant",
  },
  {
    key: "verifiableContacts",
    label: "Public website and verifiable contacts",
    kind: "yes_no",
  },
  {
    key: "willingnessMou",
    label: "Willingness to sign institutional MOU",
    kind: "yes_no",
  },
  {
    key: "willingnessPlacementAgreement",
    label: "Willingness to sign three-way placement agreement",
    kind: "yes_no",
  },
];

const EMPTY_SCREENING = SCREENING_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = "";
    return acc;
  },
  {} as Record<ScreeningKey, string>
);

const EMPTY_FORM: FormState = {
  organisationName: "",
  country: "",
  industrySector: "",
  physicalAddress: "",
  publicWebsite: "",
  officialEmailPhone: "",
  contactName: "",
  contactTitle: "",
  contactEmail: "",
  contactPhone: "",
  hostOrganisationId: "",
  screening: EMPTY_SCREENING,
  legallyRegisteredEvidence: "",
  thematicAreas: [],
  missingInformation: "",
  eligibilityOutcome: "",
  reasonForOutcome: "",
  evidenceAttached: false,
  evidenceFileName: "",
  declared: false,
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
  return `smecc2e.organisation-host-eligibility-screening.${applicationId}`;
}

function optionsForKind(
  kind: (typeof SCREENING_FIELDS)[number]["kind"]
): [string, string][] {
  switch (kind) {
    case "yes_no":
      return [
        ["yes", "Yes"],
        ["no", "No"],
      ];
    case "yes_no_cant":
      return [
        ["yes", "Yes"],
        ["no", "No"],
        ["cant_say", "Can't say"],
      ];
    case "yes_no_evidence":
      return [
        ["yes", "Yes"],
        ["no", "No"],
        ["evidence", "Evidence"],
      ];
    case "yes_no_na":
      return [
        ["yes", "Yes"],
        ["no", "No"],
        ["na", "N/A"],
      ];
    case "thematic":
      return [
        ["yes", "Yes"],
        ["no", "No"],
      ];
  }
}

export function OrganisationHostEligibilityScreeningForm({
  user,
  displayName,
}: {
  user: ApplicantSessionUser;
  displayName: string;
}) {
  const app = user.application;
  const applicationId = app?.id ?? user.email;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const nominationRaw = localStorage.getItem(
        `smecc2e.organisation-identification-nomination.${applicationId}`
      );
      let prefill: Partial<FormState> = {};
      if (nominationRaw) {
        const nomination = JSON.parse(nominationRaw) as {
          organisationName?: string;
          country?: string;
          industrySector?: string;
          physicalAddress?: string;
          publicWebsite?: string;
          officialEmail?: string;
          officialPhone?: string;
          contactName?: string;
          contactRole?: string;
          contactEmail?: string;
          contactPhone?: string;
          hostOrganisationId?: string;
        };
        prefill = {
          organisationName: nomination.organisationName ?? "",
          country: nomination.country ?? "",
          industrySector: nomination.industrySector ?? "",
          physicalAddress: nomination.physicalAddress ?? "",
          publicWebsite: nomination.publicWebsite ?? "",
          officialEmailPhone: [nomination.officialEmail, nomination.officialPhone]
            .filter(Boolean)
            .join(" / "),
          contactName: nomination.contactName ?? "",
          contactTitle: nomination.contactRole ?? "",
          contactEmail: nomination.contactEmail ?? "",
          contactPhone: nomination.contactPhone ?? "",
          hostOrganisationId: nomination.hostOrganisationId ?? "",
        };
      }

      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({ ...EMPTY_FORM, ...prefill });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...prefill,
        ...parsed,
        screening: { ...EMPTY_SCREENING, ...parsed.screening },
        thematicAreas: parsed.thematicAreas ?? [],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
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

  const updateScreening = (key: ScreeningKey, value: string) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      screening: { ...current.screening, [key]: value },
      signature: "",
      signedAt: "",
      ...(key === "legallyRegistered" && value !== "evidence"
        ? { legallyRegisteredEvidence: "" }
        : {}),
      ...(key === "thematicRelevance" && value !== "yes"
        ? { thematicAreas: [] }
        : {}),
    }));
  };

  const sign = () => {
    if (saved) return;
    if (!form.organisationName.trim()) {
      setError("Enter the organisation name.");
      return;
    }
    if (!form.country.trim()) {
      setError("Enter the country.");
      return;
    }
    for (const field of SCREENING_FIELDS) {
      if (!form.screening[field.key]) {
        setError(`Complete screening for: ${field.label}.`);
        return;
      }
    }
    if (
      form.screening.legallyRegistered === "evidence" &&
      !form.legallyRegisteredEvidence.trim()
    ) {
      setError("Provide evidence for legal registration.");
      return;
    }
    if (
      form.screening.thematicRelevance === "yes" &&
      form.thematicAreas.length === 0
    ) {
      setError("Select the relevant SMECC2E thematic area(s).");
      return;
    }
    if (!form.eligibilityOutcome) {
      setError("Select the eligibility outcome.");
      return;
    }
    if (!form.reasonForOutcome.trim()) {
      setError("Enter the reason for the outcome.");
      return;
    }
    if (!form.evidenceAttached || !form.evidenceFileName) {
      setError("Attach the host documentation checklist and supporting evidence.");
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
            Organization host eligibility screening form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Two SMECC2E Partners
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Screen a proposed host against all mandatory eligibility requirements
          before technical assessment. Assessor sign-off remains Pending until
          completed by authorised partner staff.
        </p>

        <FormTable title="Host organisation record">
          <ReadRow
            label="Host Organisation ID"
            value={pending(form.hostOrganisationId)}
          />
          <TextRow
            label="Organisation name"
            value={form.organisationName}
            disabled={saved}
            onChange={(organisationName) => update({ organisationName })}
          />
          <TextRow
            label="Country"
            value={form.country}
            disabled={saved}
            onChange={(country) => update({ country })}
          />
          <TextRow
            label="Industry / sector"
            value={form.industrySector}
            disabled={saved}
            onChange={(industrySector) => update({ industrySector })}
          />
          <TextRow
            label="Physical address"
            value={form.physicalAddress}
            disabled={saved}
            multiline
            rows={3}
            onChange={(physicalAddress) => update({ physicalAddress })}
          />
          <TextRow
            label="Public website / URL"
            value={form.publicWebsite}
            disabled={saved}
            onChange={(publicWebsite) => update({ publicWebsite })}
          />
          <TextRow
            label="Official email / phone"
            value={form.officialEmailPhone}
            disabled={saved}
            onChange={(officialEmailPhone) => update({ officialEmailPhone })}
          />
          <TextRow
            label="Primary contact — name"
            value={form.contactName}
            disabled={saved}
            onChange={(contactName) => update({ contactName })}
          />
          <TextRow
            label="Primary contact — title"
            value={form.contactTitle}
            disabled={saved}
            onChange={(contactTitle) => update({ contactTitle })}
          />
          <TextRow
            label="Primary contact — email"
            value={form.contactEmail}
            disabled={saved}
            onChange={(contactEmail) => update({ contactEmail })}
          />
          <TextRow
            label="Primary contact — phone"
            value={form.contactPhone}
            disabled={saved}
            onChange={(contactPhone) => update({ contactPhone })}
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Mandatory eligibility screening
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="w-[48%] border border-slate-300 px-3 py-2">
                  Field / item
                </th>
                <th className="border border-slate-300 px-3 py-2">Entry</th>
              </tr>
            </thead>
            <tbody>
              {SCREENING_FIELDS.map((field) => (
                <tr key={field.key}>
                  <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
                    {field.label}
                  </th>
                  <td className="border border-slate-300 px-3 py-2">
                    <div className="space-y-2">
                      <RadioGroup
                        name={`ohes-${field.key}`}
                        value={form.screening[field.key]}
                        disabled={saved}
                        onChange={(value) => updateScreening(field.key, value)}
                        options={optionsForKind(field.kind)}
                      />
                      {field.key === "legallyRegistered" &&
                        form.screening.legallyRegistered === "evidence" && (
                          <textarea
                            value={form.legallyRegisteredEvidence}
                            disabled={saved}
                            rows={2}
                            placeholder="Describe evidence"
                            onChange={(event) =>
                              update({
                                legallyRegisteredEvidence: event.target.value,
                              })
                            }
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                          />
                        )}
                      {field.key === "thematicRelevance" &&
                        form.screening.thematicRelevance === "yes" && (
                          <div className="flex flex-col gap-2">
                            {THEMATIC_OPTIONS.map(([value, label]) => (
                              <label
                                key={value}
                                className="inline-flex items-center gap-2 text-sm text-slate-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.thematicAreas.includes(value)}
                                  disabled={saved}
                                  onChange={() =>
                                    update({
                                      thematicAreas: toggleListValue(
                                        form.thematicAreas,
                                        value
                                      ),
                                    })
                                  }
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <FormTable title="Screening outcome">
          <TextRow
            label="Missing information / clarification required"
            value={form.missingInformation}
            disabled={saved}
            multiline
            rows={4}
            onChange={(missingInformation) => update({ missingInformation })}
          />
          <ChoiceRow label="Eligibility outcome">
            <RadioGroup
              name="ohes-outcome"
              value={form.eligibilityOutcome}
              disabled={saved}
              onChange={(eligibilityOutcome) =>
                update({
                  eligibilityOutcome: eligibilityOutcome as EligibilityOutcome,
                })
              }
              options={[
                ["eligible", "Eligible"],
                ["ineligible", "Ineligible"],
                ["pending_clarification", "Pending clarification"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Reason for outcome"
            value={form.reasonForOutcome}
            disabled={saved}
            multiline
            rows={4}
            onChange={(reasonForOutcome) => update({ reasonForOutcome })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (upload)
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Host documentation checklist and supporting evidence"
              checked={form.evidenceAttached}
              fileName={form.evidenceFileName}
              disabled={saved}
              onCheckedChange={(evidenceAttached) =>
                update({
                  evidenceAttached,
                  evidenceFileName: evidenceAttached
                    ? form.evidenceFileName
                    : "",
                })
              }
              onFileNameChange={(evidenceFileName) =>
                update({ evidenceAttached: true, evidenceFileName })
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
              role: "Assessor 1 — Evaluator",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Assessor 2 — Evaluator",
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
            {
              role: "Administrators",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Quality Assurance Officer",
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
            Eligibility screening acknowledged
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
            ? "Screening acknowledged"
            : "Acknowledge eligibility screening"}
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
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
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
          type="text"
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
