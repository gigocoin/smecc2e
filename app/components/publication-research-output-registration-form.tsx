"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const OUTPUT_TYPE_OPTIONS = [
  ["article", "Article"],
  ["conference_paper", "Conference paper"],
  ["report", "Report"],
  ["dataset", "Dataset"],
  ["software", "Software"],
  ["prototype", "Prototype"],
  ["policy_brief", "Policy brief"],
  ["thesis_report", "Thesis Report"],
  ["other", "Other"],
] as const;

const STATUS_OPTIONS = [
  ["planned", "Planned"],
  ["submitted", "Submitted"],
  ["accepted", "Accepted"],
  ["published", "Published"],
  ["completed", "Completed"],
] as const;

const ACK_OPTIONS = [
  ["yes", "Yes"],
  ["no", "No"],
  ["na", "N/A"],
] as const;

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

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type OutputType = (typeof OUTPUT_TYPE_OPTIONS)[number][0] | "";
type OutputStatus = (typeof STATUS_OPTIONS)[number][0] | "";
type Acknowledgement = (typeof ACK_OPTIONS)[number][0] | "";
type ThematicKey = (typeof THEMATIC_OPTIONS)[number][0];
type GatewayKey = (typeof GATEWAY_OPTIONS)[number][0];

type LetterFields = {
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type OutputEntry = {
  outputNo: string;
  outputType: OutputType;
  otherOutputType: string;
  title: string;
  authors: string;
  status: OutputStatus;
  venue: string;
  doiReference: string;
  outputDate: string;
  acknowledgement: Acknowledgement;
  thematicAreas: ThematicKey[];
  gatewayPriorities: GatewayKey[];
  evidenceAttached: boolean;
  evidenceFileName: string;
  signature: string;
  signedAt: string;
};

type FormState = {
  cohort: Cohort;
  entries: OutputEntry[];
  draft: OutputEntry;
};

function padNo(n: number): string {
  return String(n).padStart(2, "0");
}

function buildOutputNo(scholarId: string, sequence: number): string {
  const id = scholarId.trim().replace(/\s+/g, "").toUpperCase() || "SCHOLAR";
  return `${id}-OUT-${padNo(sequence)}`;
}

function emptyDraft(outputNo: string): OutputEntry {
  return {
    outputNo,
    outputType: "",
    otherOutputType: "",
    title: "",
    authors: "",
    status: "",
    venue: "",
    doiReference: "",
    outputDate: "",
    acknowledgement: "",
    thematicAreas: [],
    gatewayPriorities: [],
    evidenceAttached: false,
    evidenceFileName: "",
    signature: "",
    signedAt: "",
  };
}

function pending(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || text === "[pending]" || text === "—") return "Pending";
  return text;
}

function mobilityCategory(type: string): string {
  if (/staff/i.test(type)) return "Staff";
  if (/trainee/i.test(type)) return "Trainee";
  if (/phd/i.test(type)) return "PhD";
  if (/msc|master/i.test(type)) return "Masters";
  return pending(type);
}

function outputTypeLabel(value: OutputType): string {
  return OUTPUT_TYPE_OPTIONS.find(([id]) => id === value)?.[1] ?? "—";
}

function statusLabel(value: OutputStatus): string {
  return STATUS_OPTIONS.find(([id]) => id === value)?.[1] ?? "—";
}

function storageKey(applicationId: string): string {
  return `smecc2e.publication-research-output.${applicationId}`;
}

function toggleListValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function PublicationResearchOutputRegistrationForm({
  user,
  displayName,
}: {
  user: ApplicantSessionUser;
  displayName: string;
}) {
  const app = user.application;
  const applicationId = app?.id ?? user.email;
  const scholarId = app?.publicId || app?.id || "SCHOLAR";
  const [letter, setLetter] = useState<LetterFields | null>(null);
  const [form, setForm] = useState<FormState>({
    cohort: "cohort-1",
    entries: [],
    draft: emptyDraft(buildOutputNo(scholarId, 1)),
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({
          cohort: "cohort-1",
          entries: [],
          draft: emptyDraft(buildOutputNo(scholarId, 1)),
        });
        setSaved(false);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const draft =
        parsed.draft && typeof parsed.draft === "object"
          ? {
              ...emptyDraft(buildOutputNo(scholarId, entries.length + 1)),
              ...parsed.draft,
              thematicAreas: parsed.draft.thematicAreas ?? [],
              gatewayPriorities: parsed.draft.gatewayPriorities ?? [],
              outputNo:
                parsed.draft.outputNo ||
                buildOutputNo(scholarId, entries.length + 1),
            }
          : emptyDraft(buildOutputNo(scholarId, entries.length + 1));
      setForm({
        cohort: parsed.cohort ?? "cohort-1",
        entries,
        draft,
      });
      setSaved(Boolean(parsed.draft?.signedAt));
    } catch {
      setForm({
        cohort: "cohort-1",
        entries: [],
        draft: emptyDraft(buildOutputNo(scholarId, 1)),
      });
      setSaved(false);
    }
  }, [applicationId, scholarId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/nominee-letter");
        if (!res.ok) return;
        const data = (await res.json()) as {
          letter?: {
            auto?: { nationality?: string };
            editable?: {
              mobilityType?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
            };
          };
        };
        if (cancelled || !data.letter) return;
        setLetter({
          mobilityType: data.letter.editable?.mobilityType ?? "",
          startDate: data.letter.editable?.mobilityStartDate ?? "",
          endDate: data.letter.editable?.mobilityEndDate ?? "",
          nationality: data.letter.auto?.nationality ?? "",
        });
      } catch {
        setLetter(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = useMemo(() => {
    const parts = [app?.firstName, app?.middleName, app?.surname]
      .map((part) => part?.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : displayName;
  }, [app?.firstName, app?.middleName, app?.surname, displayName]);

  const mobilitySource = letter?.mobilityType || app?.typeOfMobility || "";

  const persist = (next: FormState) => {
    try {
      localStorage.setItem(storageKey(applicationId), JSON.stringify(next));
    } catch {
      setError(
        "The form was updated in this session, but it could not be stored in this browser."
      );
    }
  };

  const updateDraft = (patch: Partial<OutputEntry>) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      draft: {
        ...current.draft,
        ...patch,
        signature: "",
        signedAt: "",
      },
    }));
  };

  const updateCohort = (cohort: Cohort) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({ ...current, cohort }));
  };

  const sign = () => {
    if (saved) return;
    if (!form.draft.outputType) {
      setError("Select the output type.");
      return;
    }
    if (
      form.draft.outputType === "other" &&
      !form.draft.otherOutputType.trim()
    ) {
      setError("Describe the other output type.");
      return;
    }
    if (!form.draft.title.trim()) {
      setError("Enter the output title.");
      return;
    }
    if (!form.draft.authors.trim()) {
      setError("Enter the authors / contributors.");
      return;
    }
    if (!form.draft.status) {
      setError("Select the output status.");
      return;
    }
    if (!form.draft.venue.trim()) {
      setError("Enter the venue / publisher.");
      return;
    }
    if (!form.draft.outputDate) {
      setError("Enter the output date.");
      return;
    }
    if (!form.draft.acknowledgement) {
      setError("Indicate whether SMECC2E/EU acknowledgement is included.");
      return;
    }
    if (form.draft.thematicAreas.length === 0) {
      setError("Select at least one linked thematic area.");
      return;
    }
    if (form.draft.gatewayPriorities.length === 0) {
      setError("Select at least one Global Gateway priority.");
      return;
    }
    const signedAt = new Date().toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const signedDraft: OutputEntry = {
      ...form.draft,
      outputNo: buildOutputNo(scholarId, form.entries.length + 1),
      signature: fullName,
      signedAt,
    };
    const next: FormState = {
      ...form,
      draft: signedDraft,
      entries: [...form.entries, signedDraft],
    };
    setForm(next);
    setSaved(true);
    setError(null);
    persist(next);
  };

  const startNextOutput = () => {
    const nextDraft = emptyDraft(
      buildOutputNo(scholarId, form.entries.length + 1)
    );
    const next: FormState = {
      ...form,
      draft: nextDraft,
    };
    setForm(next);
    setSaved(false);
    setError(null);
    persist(next);
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
            Publication / research output registration form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Multiple time | Primary user: Scholar / Supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Register research and dissemination outputs arising from the
          mobility.
        </p>

        {form.entries.length > 0 && (
          <section className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
                Registered outputs
              </caption>
              <thead>
                <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="border border-slate-300 px-3 py-2">No.</th>
                  <th className="border border-slate-300 px-3 py-2">Type</th>
                  <th className="border border-slate-300 px-3 py-2">Title</th>
                  <th className="border border-slate-300 px-3 py-2">Status</th>
                  <th className="border border-slate-300 px-3 py-2">Signed</th>
                </tr>
              </thead>
              <tbody>
                {form.entries.map((entry) => (
                  <tr key={entry.outputNo}>
                    <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
                      {entry.outputNo}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {entry.outputType === "other"
                        ? entry.otherOutputType || "Other"
                        : outputTypeLabel(entry.outputType)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {entry.title || "—"}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {statusLabel(entry.status)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {entry.signedAt || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="publication-output-cohort"
              value={form.cohort}
              disabled={saved}
              onChange={(cohort) => updateCohort(cohort as Cohort)}
              options={[
                ["cohort-1", "Cohort 1"],
                ["cohort-2", "Cohort 2"],
                ["cohort-3", "Cohort 3"],
              ]}
            />
          </ChoiceRow>
          <ReadRow
            label="Applicant / scholar ID"
            value={pending(app?.publicId || app?.id)}
          />
          <ReadRow label="Full names" value={fullName} />
          <ReadRow
            label="Nationality"
            value={pending(letter?.nationality || app?.nationality)}
          />
          <ReadRow
            label="Mobility category"
            value={mobilityCategory(mobilitySource)}
          />
          <ReadRow
            label="Mobility start date"
            value={pending(letter?.startDate)}
          />
          <ReadRow
            label="Mobility end date"
            value={pending(letter?.endDate)}
          />
        </FormTable>

        <FormTable title="Output">
          <ReadRow
            label="Output number"
            value={
              form.draft.outputNo ||
              buildOutputNo(scholarId, form.entries.length + 1)
            }
          />
          <ChoiceRow label="Output type (please select)">
            <RadioGroup
              name="publication-output-type"
              value={form.draft.outputType}
              disabled={saved}
              onChange={(outputType) =>
                updateDraft({
                  outputType: outputType as OutputType,
                  otherOutputType:
                    outputType === "other" ? form.draft.otherOutputType : "",
                })
              }
              options={[...OUTPUT_TYPE_OPTIONS]}
            />
          </ChoiceRow>
          {form.draft.outputType === "other" && (
            <TextRow
              label="Other output type"
              value={form.draft.otherOutputType}
              disabled={saved}
              onChange={(otherOutputType) => updateDraft({ otherOutputType })}
            />
          )}
          <TextRow
            label="Title"
            value={form.draft.title}
            disabled={saved}
            onChange={(title) => updateDraft({ title })}
          />
          <TextRow
            label="Authors / contributors"
            value={form.draft.authors}
            disabled={saved}
            multiline
            rows={3}
            onChange={(authors) => updateDraft({ authors })}
          />
          <ChoiceRow label="Status">
            <RadioGroup
              name="publication-output-status"
              value={form.draft.status}
              disabled={saved}
              onChange={(status) =>
                updateDraft({ status: status as OutputStatus })
              }
              options={[...STATUS_OPTIONS]}
            />
          </ChoiceRow>
          <TextRow
            label="Venue / publisher"
            value={form.draft.venue}
            disabled={saved}
            onChange={(venue) => updateDraft({ venue })}
          />
          <TextRow
            label="DOI / link / reference"
            value={form.draft.doiReference}
            disabled={saved}
            onChange={(doiReference) => updateDraft({ doiReference })}
          />
          <TextRow
            label="Date"
            type="date"
            value={form.draft.outputDate}
            disabled={saved}
            onChange={(outputDate) => updateDraft({ outputDate })}
          />
          <ChoiceRow label="SMECC2E/EU acknowledgement included">
            <RadioGroup
              name="publication-output-ack"
              value={form.draft.acknowledgement}
              disabled={saved}
              onChange={(acknowledgement) =>
                updateDraft({
                  acknowledgement: acknowledgement as Acknowledgement,
                })
              }
              options={[...ACK_OPTIONS]}
            />
          </ChoiceRow>
          <ChoiceRow label="Linked thematic area">
            <CheckboxGroup
              options={[...THEMATIC_OPTIONS]}
              values={form.draft.thematicAreas}
              disabled={saved}
              onToggle={(value) =>
                updateDraft({
                  thematicAreas: toggleListValue(
                    form.draft.thematicAreas,
                    value as ThematicKey
                  ),
                })
              }
            />
          </ChoiceRow>
          <ChoiceRow label="Relevant Global Gateway priorities covered">
            <CheckboxGroup
              options={[...GATEWAY_OPTIONS]}
              values={form.draft.gatewayPriorities}
              disabled={saved}
              onToggle={(value) =>
                updateDraft({
                  gatewayPriorities: toggleListValue(
                    form.draft.gatewayPriorities,
                    value as GatewayKey
                  ),
                })
              }
            />
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Upload a copy of the document / evidence"
              checked={form.draft.evidenceAttached}
              fileName={form.draft.evidenceFileName}
              disabled={saved}
              onCheckedChange={(evidenceAttached) =>
                updateDraft({
                  evidenceAttached,
                  evidenceFileName: evidenceAttached
                    ? form.draft.evidenceFileName
                    : "",
                })
              }
              onFileNameChange={(evidenceFileName) =>
                updateDraft({ evidenceAttached: true, evidenceFileName })
              }
            />
          </div>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.draft.signature || "Awaiting signature",
              date: form.draft.signedAt || "Awaiting signature",
            },
            {
              role: "Host Academic Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Host Focal Person",
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
            Research output registered
            {form.draft.signedAt ? ` on ${form.draft.signedAt}` : ""}.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={sign}
            disabled={saved}
            className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
          >
            {saved ? "Output registered" : "Sign and register output"}
          </button>
          {saved && (
            <button
              type="button"
              onClick={startNextOutput}
              className="inline-flex rounded-lg border border-[#062763] px-5 py-2.5 text-sm font-semibold text-[#062763] transition hover:bg-slate-50"
            >
              Start next output registration
            </button>
          )}
        </div>
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
  onToggle,
  disabled = false,
}: {
  options: [string, string][];
  values: string[];
  onToggle: (value: string) => void;
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
            onChange={() => onToggle(optionValue)}
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
