"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { hostInstitutions } from "@/lib/programmes";
import { SEED_UNIVERSITY_COUNTRIES } from "@/lib/university-seed-countries";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The attached document is the final version of the signed MOU.";

const HEI_OPTIONS = [
  "Moi University",
  "Lupane State University",
  "University of Rwanda",
  "University of Cape Coast",
  "University of Sierra Leone",
  "University of Nigeria (UNN)",
] as const;

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
  universityName: string;
  universityPhysicalAddress: string;
  universityWebsite: string;
  universityEmail: string;
  universityPhone: string;
  focalName: string;
  focalRole: string;
  focalEmail: string;
  focalPhone: string;
  mouAttached: boolean;
  mouFileName: string;
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
  universityName: "",
  universityPhysicalAddress: "",
  universityWebsite: "",
  universityEmail: "",
  universityPhone: "",
  focalName: "",
  focalRole: "",
  focalEmail: "",
  focalPhone: "",
  mouAttached: false,
  mouFileName: "",
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
  return `smecc2e.signed-mous.${applicationId}`;
}

function universityCountry(name: string): string {
  if (!name) return "Pending";
  return (
    SEED_UNIVERSITY_COUNTRIES[name] ||
    SEED_UNIVERSITY_COUNTRIES[
      hostInstitutions.find((item) => item.includes(name.replace(" (UNN)", ""))) ??
        ""
    ] ||
    pending("")
  );
}

export function SignedMousForm({
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
      let partnerPrefill = "";
      if (nominationRaw) {
        const nomination = JSON.parse(nominationRaw) as Partial<HostRecord> & {
          partnerInstitution?: string;
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
        partnerPrefill = nomination.partnerInstitution ?? "";
      } else {
        setHost(EMPTY_HOST);
      }

      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({
          ...EMPTY_FORM,
          universityName: partnerPrefill,
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        universityName: parsed.universityName || partnerPrefill,
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
    if (!form.universityName) {
      setError("Select the SMECC2E partner university.");
      return;
    }
    if (!form.focalName.trim() || !form.focalRole.trim()) {
      setError("Enter the primary focal contact person name and role.");
      return;
    }
    if (!form.focalEmail.trim() || !form.focalPhone.trim()) {
      setError("Enter the primary focal contact email and phone.");
      return;
    }
    if (!form.mouAttached || !form.mouFileName) {
      setError("Attach the signed MOU.");
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
            Signed university-company memorandum of understanding (MOU) upload
            form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Partner HEI + Company
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Document the institutional basis for repeated SMECC2E internship /
          traineeship and cooperation. Host Focal Person sign-off remains Pending
          until completed by authorised staff.
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

        <FormTable title="SMECC2E HEI record">
          <ChoiceRow label="University name">
            <div className="flex flex-col gap-2">
              {HEI_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="radio"
                    name="mou-university"
                    value={option}
                    checked={form.universityName === option}
                    disabled={saved}
                    onChange={() => update({ universityName: option })}
                  />
                  {option === "University of Nigeria (UNN)"
                    ? "University of Nigeria"
                    : option}
                </label>
              ))}
            </div>
          </ChoiceRow>
          <ReadRow
            label="Country"
            value={universityCountry(form.universityName)}
          />
          <TextRow
            label="Physical address"
            value={form.universityPhysicalAddress}
            disabled={saved}
            multiline
            rows={2}
            onChange={(universityPhysicalAddress) =>
              update({ universityPhysicalAddress })
            }
          />
          <TextRow
            label="Public website / URL"
            value={form.universityWebsite}
            disabled={saved}
            onChange={(universityWebsite) => update({ universityWebsite })}
          />
          <TextRow
            label="Official email"
            value={form.universityEmail}
            disabled={saved}
            onChange={(universityEmail) => update({ universityEmail })}
          />
          <TextRow
            label="Official phone"
            value={form.universityPhone}
            disabled={saved}
            onChange={(universityPhone) => update({ universityPhone })}
          />
          <TextRow
            label="Primary focal contact — name"
            value={form.focalName}
            disabled={saved}
            onChange={(focalName) => update({ focalName })}
          />
          <TextRow
            label="Primary focal contact — role"
            value={form.focalRole}
            disabled={saved}
            onChange={(focalRole) => update({ focalRole })}
          />
          <TextRow
            label="Primary focal contact — email"
            value={form.focalEmail}
            disabled={saved}
            onChange={(focalEmail) => update({ focalEmail })}
          />
          <TextRow
            label="Primary focal contact — phone"
            value={form.focalPhone}
            disabled={saved}
            onChange={(focalPhone) => update({ focalPhone })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            MOU terms
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            Please see the signed MOU attached.
          </p>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (upload)
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Signed MOU"
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
              role: "Host Focal Person",
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
            Signed MOU acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "MOU acknowledged" : "Acknowledge signed MOU"}
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
