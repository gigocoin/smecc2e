"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { hostInstitutions } from "@/lib/programmes";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the organisation has been identified in good faith for assessment against the SMECC2E host-selection requirements.";

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
type PlacementType =
  | ""
  | "internship"
  | "traineeship"
  | "internship_and_traineeship";
type Willingness = "" | "yes" | "no" | "pending";

type FormState = {
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
  partnerInstitution: string;
  focalName: string;
  focalEmail: string;
  focalPhone: string;
  thematicAreas: ThematicKey[];
  gatewayPriorities: GatewayKey[];
  placementType: PlacementType;
  proposedParticipants: string;
  initialHostingPeriod: string;
  rationale: string;
  willingness: Willingness;
  companyProfileAttached: boolean;
  companyProfileFileName: string;
  legalRegistrationAttached: boolean;
  legalRegistrationFileName: string;
  websiteEvidenceAttached: boolean;
  websiteEvidenceFileName: string;
  declared: boolean;
  hostOrganisationId: string;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
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
  partnerInstitution: "",
  focalName: "",
  focalEmail: "",
  focalPhone: "",
  thematicAreas: [],
  gatewayPriorities: [],
  placementType: "",
  proposedParticipants: "",
  initialHostingPeriod: "",
  rationale: "",
  willingness: "",
  companyProfileAttached: false,
  companyProfileFileName: "",
  legalRegistrationAttached: false,
  legalRegistrationFileName: "",
  websiteEvidenceAttached: false,
  websiteEvidenceFileName: "",
  declared: false,
  hostOrganisationId: "",
  signature: "",
  signedAt: "",
};

function pending(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || text === "[pending]" || text === "—") return "Pending";
  return text;
}

function buildHostOrganisationId(country: string, sequence: number): string {
  const slug = country
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!slug) return "";
  return `${slug} - ${String(sequence).padStart(2, "0")}`;
}

function toggleListValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function storageKey(applicationId: string): string {
  return `smecc2e.organisation-identification-nomination.${applicationId}`;
}

export function OrganisationIdentificationNominationForm({
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
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm(EMPTY_FORM);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        thematicAreas: parsed.thematicAreas ?? [],
        gatewayPriorities: parsed.gatewayPriorities ?? [],
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

  const previewHostId =
    form.hostOrganisationId ||
    (form.country.trim()
      ? buildHostOrganisationId(form.country, 1)
      : "Pending — assigned after registration");

  const update = (patch: Partial<FormState>) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      ...patch,
      signature: "",
      signedAt: "",
      hostOrganisationId: "",
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
    if (!form.industrySector.trim()) {
      setError("Enter the industry / sector.");
      return;
    }
    if (!form.physicalAddress.trim()) {
      setError("Enter the physical address.");
      return;
    }
    if (!form.officialEmail.trim()) {
      setError("Enter the official email.");
      return;
    }
    if (!form.officialPhone.trim()) {
      setError("Enter the official phone.");
      return;
    }
    if (!form.contactName.trim() || !form.contactRole.trim()) {
      setError("Enter the primary contact person name and role.");
      return;
    }
    if (!form.contactEmail.trim() || !form.contactPhone.trim()) {
      setError("Enter the primary contact email and phone.");
      return;
    }
    if (!form.partnerInstitution) {
      setError("Select the SMECC2E partner institution.");
      return;
    }
    if (
      !form.focalName.trim() ||
      !form.focalEmail.trim() ||
      !form.focalPhone.trim()
    ) {
      setError("Enter the nominating focal person details.");
      return;
    }
    if (form.thematicAreas.length === 0) {
      setError("Select at least one SMECC2E thematic area.");
      return;
    }
    if (form.gatewayPriorities.length === 0) {
      setError("Select at least one Global Gateway priority.");
      return;
    }
    if (!form.placementType) {
      setError("Select the proposed placement type.");
      return;
    }
    if (!form.proposedParticipants.trim()) {
      setError("Enter the proposed number of participants.");
      return;
    }
    if (!form.initialHostingPeriod.trim()) {
      setError("Enter the initial hosting period.");
      return;
    }
    if (!form.rationale.trim()) {
      setError("Enter the rationale for nomination.");
      return;
    }
    if (!form.willingness) {
      setError("Indicate whether initial company willingness is confirmed.");
      return;
    }
    if (!form.companyProfileAttached || !form.companyProfileFileName) {
      setError("Attach the company profile.");
      return;
    }
    if (
      !form.legalRegistrationAttached ||
      !form.legalRegistrationFileName
    ) {
      setError("Attach evidence / reference for legal registration.");
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
    const hostOrganisationId = buildHostOrganisationId(form.country, 1);
    const next = {
      ...form,
      hostOrganisationId,
      signature: fullName,
      signedAt,
    };
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
            Organisation identification / nomination form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Host-country SMECC2E focal person
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Identify and nominate a prospective public / private-sector
          organisation for SMECC2E internship / traineeship hosting. Host-country
          Focal Person sign-off remains Pending until completed by authorised
          staff.
        </p>

        <FormTable title="Host organisation record">
          <ReadRow label="Host Organisation ID" value={previewHostId} />
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
            label="Official email"
            value={form.officialEmail}
            disabled={saved}
            onChange={(officialEmail) => update({ officialEmail })}
          />
          <TextRow
            label="Official phone"
            value={form.officialPhone}
            disabled={saved}
            onChange={(officialPhone) => update({ officialPhone })}
          />
          <TextRow
            label="Primary contact — name"
            value={form.contactName}
            disabled={saved}
            onChange={(contactName) => update({ contactName })}
          />
          <TextRow
            label="Primary contact — role"
            value={form.contactRole}
            disabled={saved}
            onChange={(contactRole) => update({ contactRole })}
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

        <FormTable title="Nomination details">
          <ChoiceRow label="SMECC2E partner institution">
            <select
              value={form.partnerInstitution}
              disabled={saved}
              onChange={(event) =>
                update({ partnerInstitution: event.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
            >
              <option value="">Select partner institution</option>
              {hostInstitutions.map((institution) => (
                <option key={institution} value={institution}>
                  {institution}
                </option>
              ))}
            </select>
          </ChoiceRow>
          <TextRow
            label="Nominating focal person — name"
            value={form.focalName}
            disabled={saved}
            onChange={(focalName) => update({ focalName })}
          />
          <TextRow
            label="Nominating focal person — email"
            value={form.focalEmail}
            disabled={saved}
            onChange={(focalEmail) => update({ focalEmail })}
          />
          <TextRow
            label="Nominating focal person — phone"
            value={form.focalPhone}
            disabled={saved}
            onChange={(focalPhone) => update({ focalPhone })}
          />
          <ChoiceRow label="SMECC2E thematic area(s)">
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
          <ChoiceRow label="Proposed placement type">
            <RadioGroup
              name="oin-placement"
              value={form.placementType}
              disabled={saved}
              onChange={(placementType) =>
                update({ placementType: placementType as PlacementType })
              }
              options={[
                ["internship", "Internship"],
                ["traineeship", "Traineeship"],
                ["internship_and_traineeship", "Internship & Traineeship"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Proposed number of participants"
            value={form.proposedParticipants}
            disabled={saved}
            onChange={(proposedParticipants) =>
              update({ proposedParticipants })
            }
          />
          <TextRow
            label="Initial hosting period"
            value={form.initialHostingPeriod}
            disabled={saved}
            onChange={(initialHostingPeriod) =>
              update({ initialHostingPeriod })
            }
          />
          <TextRow
            label="Rationale for nomination"
            value={form.rationale}
            disabled={saved}
            multiline
            rows={5}
            onChange={(rationale) => update({ rationale })}
          />
          <ChoiceRow label="Initial company willingness confirmed">
            <RadioGroup
              name="oin-willingness"
              value={form.willingness}
              disabled={saved}
              onChange={(willingness) =>
                update({ willingness: willingness as Willingness })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["pending", "Pending"],
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
              label="Company profile"
              checked={form.companyProfileAttached}
              fileName={form.companyProfileFileName}
              disabled={saved}
              onCheckedChange={(companyProfileAttached) =>
                update({
                  companyProfileAttached,
                  companyProfileFileName: companyProfileAttached
                    ? form.companyProfileFileName
                    : "",
                })
              }
              onFileNameChange={(companyProfileFileName) =>
                update({
                  companyProfileAttached: true,
                  companyProfileFileName,
                })
              }
            />
            <AttachmentRow
              label="Evidence / reference for legal registration"
              checked={form.legalRegistrationAttached}
              fileName={form.legalRegistrationFileName}
              disabled={saved}
              onCheckedChange={(legalRegistrationAttached) =>
                update({
                  legalRegistrationAttached,
                  legalRegistrationFileName: legalRegistrationAttached
                    ? form.legalRegistrationFileName
                    : "",
                })
              }
              onFileNameChange={(legalRegistrationFileName) =>
                update({
                  legalRegistrationAttached: true,
                  legalRegistrationFileName,
                })
              }
            />
            <AttachmentRow
              label="Public website / URL"
              checked={form.websiteEvidenceAttached}
              fileName={form.websiteEvidenceFileName}
              disabled={saved}
              onCheckedChange={(websiteEvidenceAttached) =>
                update({
                  websiteEvidenceAttached,
                  websiteEvidenceFileName: websiteEvidenceAttached
                    ? form.websiteEvidenceFileName
                    : "",
                })
              }
              onFileNameChange={(websiteEvidenceFileName) =>
                update({
                  websiteEvidenceAttached: true,
                  websiteEvidenceFileName,
                })
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

        <ViewedTable
          title="Viewable and downloadable by"
          rows={[
            {
              role: "SMECC2E Coordinator",
              name: pending(""),
            },
            {
              role: "Administrators",
              name: pending(""),
            },
            {
              role: "Quality Assurance Officer",
              name: pending(""),
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
            Organisation nomination acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
            {form.hostOrganisationId
              ? ` Host Organisation ID: ${form.hostOrganisationId}.`
              : ""}
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved
            ? "Nomination acknowledged"
            : "Acknowledge organisation nomination"}
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
            onChange={() =>
              onChange(toggleListValue(values, optionValue))
            }
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

function ViewedTable({
  title,
  rows,
}: {
  title: string;
  rows: { role: string; name: string }[];
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.role}`}>
              <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
                {row.role}
              </th>
              <td className="border border-slate-300 px-3 py-2">{row.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
