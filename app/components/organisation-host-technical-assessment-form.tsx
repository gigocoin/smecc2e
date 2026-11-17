"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "We confirm that the score is evidence-based and does not substitute for mandatory compliance.";

const THEMATIC_OPTIONS = [
  ["sustainable_energy", "Sustainable Energy"],
  ["sustainable_materials", "Sustainable Materials"],
  ["climate_change", "Climate Change"],
  ["energy_economics", "Energy Economics"],
  ["energy_policy", "Energy Policy"],
  ["environment", "Environment"],
] as const;

type ThematicKey = (typeof THEMATIC_OPTIONS)[number][0];
type Decision =
  | ""
  | "highly_recommended"
  | "recommended"
  | "conditionally_recommended"
  | "improvement_required"
  | "not_recommended";

type ScoreKey =
  | "alignment"
  | "learningPlan"
  | "facilities"
  | "supervisor"
  | "hseWelfare"
  | "skillsEmployability"
  | "researchInnovation"
  | "institutionalCapacity"
  | "longTermCollaboration";

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
  scores: Record<ScoreKey, string>;
  comments: Record<ScoreKey, string>;
  decision: Decision;
  conditionsComments: string;
  thematicAreas: ThematicKey[];
  gatewayPriority: string;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const SCORE_FIELDS: { key: ScoreKey; label: string; max: number }[] = [
  {
    key: "alignment",
    label:
      "Alignment with SMECC2E thematic areas & Global Gateway priorities (20)",
    max: 20,
  },
  {
    key: "learningPlan",
    label: "Quality of proposed learning / work plan (15)",
    max: 15,
  },
  {
    key: "facilities",
    label: "Technical facilities, technology & professional environment (15)",
    max: 15,
  },
  {
    key: "supervisor",
    label: "Quality and availability of supervisor / mentor (10)",
    max: 10,
  },
  {
    key: "hseWelfare",
    label: "Health, safety, welfare & inclusion arrangements (10)",
    max: 10,
  },
  {
    key: "skillsEmployability",
    label: "Potential for skills development & employability (10)",
    max: 10,
  },
  {
    key: "researchInnovation",
    label: "Research, innovation & data-access opportunities (10)",
    max: 10,
  },
  {
    key: "institutionalCapacity",
    label: "Institutional capacity & previous placement experience (5)",
    max: 5,
  },
  {
    key: "longTermCollaboration",
    label: "Potential for long-term university-industry collaboration (5)",
    max: 5,
  },
];

const EMPTY_SCORES = SCORE_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = "";
    return acc;
  },
  {} as Record<ScoreKey, string>
);

const EMPTY_COMMENTS = SCORE_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = "";
    return acc;
  },
  {} as Record<ScoreKey, string>
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
  scores: EMPTY_SCORES,
  comments: EMPTY_COMMENTS,
  decision: "",
  conditionsComments: "",
  thematicAreas: [],
  gatewayPriority: "",
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

function parseScore(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function classificationForTotal(total: number | null): string {
  if (total === null) return "Pending — calculated when scores are entered";
  if (total >= 80) return "80–100 Excellent";
  if (total >= 70) return "70–79 Very Good";
  if (total >= 60) return "60–69 Acceptable";
  if (total >= 50) return "50–59 Weak";
  return "Below 50 Unsuitable";
}

function storageKey(applicationId: string): string {
  return `smecc2e.organisation-host-technical-assessment.${applicationId}`;
}

export function OrganisationHostTechnicalAssessmentForm({
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
          thematicAreas?: ThematicKey[];
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
          thematicAreas: nomination.thematicAreas ?? [],
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
        scores: { ...EMPTY_SCORES, ...parsed.scores },
        comments: { ...EMPTY_COMMENTS, ...parsed.comments },
        thematicAreas: parsed.thematicAreas ?? prefill.thematicAreas ?? [],
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

  const totalScore = useMemo(() => {
    let sum = 0;
    let counted = 0;
    for (const field of SCORE_FIELDS) {
      const value = parseScore(form.scores[field.key]);
      if (value === null) continue;
      counted += 1;
      sum += value;
    }
    return counted === SCORE_FIELDS.length ? sum : null;
  }, [form.scores]);

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

  const updateScore = (key: ScoreKey, score: string) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      scores: { ...current.scores, [key]: score },
      signature: "",
      signedAt: "",
    }));
  };

  const updateComment = (key: ScoreKey, comment: string) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      comments: { ...current.comments, [key]: comment },
      signature: "",
      signedAt: "",
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
    for (const field of SCORE_FIELDS) {
      const value = parseScore(form.scores[field.key]);
      if (value === null) {
        setError(`Enter a score for: ${field.label}.`);
        return;
      }
      if (value < 0 || value > field.max) {
        setError(`Score for ${field.label} must be between 0 and ${field.max}.`);
        return;
      }
    }
    if (!form.decision) {
      setError("Select the recommended decision.");
      return;
    }
    if (!form.conditionsComments.trim()) {
      setError("Enter conditions / comments.");
      return;
    }
    if (form.thematicAreas.length === 0) {
      setError("Select at least one supported SMECC2E thematic area.");
      return;
    }
    if (!form.gatewayPriority.trim()) {
      setError("Enter the supported Global Gateway priority.");
      return;
    }
    if (!form.evidenceAttached || !form.evidenceFileName) {
      setError("Attach the referenced assessment evidence.");
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
            Organization host technical assessment &amp; scoring form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Two SMECC2E Assessors
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Assess the technical and educational quality of an eligible host using
          the approved 100-point framework. Assessor sign-off remains Pending
          until completed by authorised partner staff.
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
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Weighted technical assessment
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="w-[42%] border border-slate-300 px-3 py-2">
                  Field / item
                </th>
                <th className="w-28 border border-slate-300 px-3 py-2">
                  Score
                </th>
                <th className="border border-slate-300 px-3 py-2">
                  Evidence / comments
                </th>
              </tr>
            </thead>
            <tbody>
              {SCORE_FIELDS.map((field) => (
                <tr key={field.key}>
                  <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
                    {field.label}
                  </th>
                  <td className="border border-slate-300 px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={field.max}
                      step={1}
                      value={form.scores[field.key]}
                      disabled={saved}
                      onChange={(event) =>
                        updateScore(field.key, event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Max {field.max}
                    </p>
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    <textarea
                      value={form.comments[field.key]}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateComment(field.key, event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold text-[#062763]">
                  TOTAL
                </th>
                <td
                  className="border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-[#062763]"
                  colSpan={2}
                >
                  {totalScore === null ? "Pending" : `${totalScore} / 100`}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <FormTable title="Recommendation">
          <ReadRow
            label="Classification"
            value={classificationForTotal(totalScore)}
          />
          <ChoiceRow label="Recommended decision">
            <RadioGroup
              name="ohta-decision"
              value={form.decision}
              disabled={saved}
              onChange={(decision) =>
                update({ decision: decision as Decision })
              }
              options={[
                ["highly_recommended", "Highly Recommended"],
                ["recommended", "Recommended"],
                ["conditionally_recommended", "Conditionally Recommended"],
                ["improvement_required", "Improvement Required"],
                ["not_recommended", "Not Recommended"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Conditions / comments"
            value={form.conditionsComments}
            disabled={saved}
            multiline
            rows={4}
            onChange={(conditionsComments) => update({ conditionsComments })}
          />
          <ChoiceRow label="Supported SMECC2E thematic area(s)">
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
          </ChoiceRow>
          <TextRow
            label="Supported Global Gateway priority"
            value={form.gatewayPriority}
            disabled={saved}
            onChange={(gatewayPriority) => update({ gatewayPriority })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (upload)
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Referenced assessment evidence"
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
              role: "Assessor 1",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Assessor 2",
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
            Technical assessment acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
            {totalScore !== null ? ` Total score: ${totalScore}/100.` : ""}
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved
            ? "Assessment acknowledged"
            : "Acknowledge technical assessment"}
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
