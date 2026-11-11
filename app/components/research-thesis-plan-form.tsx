"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The scholar and supervisors confirm that the plan is academically appropriate and consistent with the approved mobility objectives.";

const OUTPUT_OPTIONS = [
  ["thesis_chapter", "Thesis chapter"],
  ["report", "Report"],
  ["publication", "Publication"],
  ["presentation", "Presentation"],
  ["dataset", "Dataset"],
  ["prototype", "Prototype"],
  ["other", "Other"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type OutputKey = (typeof OUTPUT_OPTIONS)[number][0];

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type Milestone = {
  id: string;
  description: string;
  targetDate: string;
};

type FormState = {
  cohort: Cohort;
  workingTitle: string;
  researchProblem: string;
  objectives: string;
  methodology: string;
  datasetsFacilities: string;
  ethicsStatus: string;
  milestones: Milestone[];
  expectedOutputs: OutputKey[];
  otherOutput: string;
  assessmentMethod: string;
  thematicAlignment: string;
  riskContingency: string;
  proposalAttached: boolean;
  proposalFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function newMilestone(): Milestone {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    targetDate: "",
  };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  workingTitle: "",
  researchProblem: "",
  objectives: "",
  methodology: "",
  datasetsFacilities: "",
  ethicsStatus: "",
  milestones: [newMilestone()],
  expectedOutputs: [],
  otherOutput: "",
  assessmentMethod: "",
  thematicAlignment: "",
  riskContingency: "",
  proposalAttached: false,
  proposalFileName: "",
  declared: false,
  signature: "",
  signedAt: "",
};

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

function mobilityKind(type: string): string {
  if (/staff/i.test(type)) return "Staff";
  if (/trainee/i.test(type)) return "Traineeship";
  if (/credit/i.test(type)) return "Credit-Seeking";
  if (/degree/i.test(type)) return "Degree-Seeking";
  return pending(type);
}

function storageKey(applicationId: string): string {
  return `smecc2e.research-thesis-plan.${applicationId}`;
}

export function ResearchThesisPlanForm({
  user,
  displayName,
}: {
  user: ApplicantSessionUser;
  displayName: string;
}) {
  const app = user.application;
  const applicationId = app?.id ?? user.email;
  const [letter, setLetter] = useState<LetterFields | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({ ...EMPTY_FORM, milestones: [newMilestone()] });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        milestones:
          parsed.milestones && parsed.milestones.length > 0
            ? parsed.milestones
            : [newMilestone()],
        expectedOutputs: parsed.expectedOutputs ?? [],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({ ...EMPTY_FORM, milestones: [newMilestone()] });
    }
  }, [applicationId]);

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
              hostUniversity?: string;
              mobilityType?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
            };
          };
        };
        if (cancelled || !data.letter) return;
        setLetter({
          host: data.letter.editable?.hostUniversity ?? "",
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
  const homeInstitution = applicantHomeInstitution({
    masterProgrammeUniversity: app?.masterProgrammeUniversity,
    bachelorProgrammeUniversity: app?.bachelorProgrammeUniversity,
  });

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

  const updateMilestone = (id: string, patch: Partial<Milestone>) => {
    update({
      milestones: form.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, ...patch } : milestone
      ),
    });
  };

  const addMilestone = () => {
    update({ milestones: [...form.milestones, newMilestone()] });
  };

  const removeMilestone = (id: string) => {
    if (form.milestones.length <= 1) return;
    update({
      milestones: form.milestones.filter((milestone) => milestone.id !== id),
    });
  };

  const toggleOutput = (output: OutputKey) => {
    if (saved) return;
    const selected = form.expectedOutputs.includes(output);
    update({
      expectedOutputs: selected
        ? form.expectedOutputs.filter((item) => item !== output)
        : [...form.expectedOutputs, output],
      otherOutput: output === "other" && selected ? "" : form.otherOutput,
    });
  };

  const sign = () => {
    if (saved) return;
    if (!form.workingTitle.trim()) {
      setError("Enter the working title.");
      return;
    }
    if (!form.researchProblem.trim() || !form.objectives.trim()) {
      setError("Enter the research problem/background and objectives.");
      return;
    }
    if (!form.methodology.trim()) {
      setError("Enter the methodology.");
      return;
    }
    if (
      !form.milestones.some(
        (milestone) => milestone.description.trim() || milestone.targetDate
      )
    ) {
      setError("Enter at least one milestone and target date.");
      return;
    }
    if (form.expectedOutputs.length === 0) {
      setError("Select at least one expected output.");
      return;
    }
    if (
      form.expectedOutputs.includes("other") &&
      !form.otherOutput.trim()
    ) {
      setError("Describe the other expected output.");
      return;
    }
    if (!form.declared) {
      setError("Confirm the declaration before you sign.");
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
            Research / thesis plan form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Masters / PhD scholar + Host supervisor + Home
            supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Define research objectives, milestones, outputs and assessment
          arrangements where research is the main mobility activity.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="research-thesis-cohort"
              value={form.cohort}
              disabled={saved}
              onChange={(cohort) => update({ cohort: cohort as Cohort })}
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
          <ReadRow label="Mobility type" value={mobilityKind(mobilitySource)} />
          <ReadRow
            label="Home institution"
            value={pending(homeInstitution === "—" ? "" : homeInstitution)}
          />
          <ReadRow
            label="Host institution / organization"
            value={pending(letter?.host || app?.preferredHostInstitution)}
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

        <FormTable title="Research plan">
          <TextRow
            label="Working title"
            value={form.workingTitle}
            disabled={saved}
            onChange={(workingTitle) => update({ workingTitle })}
          />
          <TextRow
            label="Research problem/background"
            value={form.researchProblem}
            disabled={saved}
            multiline
            onChange={(researchProblem) => update({ researchProblem })}
          />
          <TextRow
            label="Objectives/research questions"
            value={form.objectives}
            disabled={saved}
            multiline
            onChange={(objectives) => update({ objectives })}
          />
          <TextRow
            label="Methodology"
            value={form.methodology}
            disabled={saved}
            multiline
            onChange={(methodology) => update({ methodology })}
          />
          <TextRow
            label="Planned datasets/facilities/laboratories"
            value={form.datasetsFacilities}
            disabled={saved}
            multiline
            onChange={(datasetsFacilities) => update({ datasetsFacilities })}
          />
          <TextRow
            label="Ethics approval required/status"
            value={form.ethicsStatus}
            disabled={saved}
            onChange={(ethicsStatus) => update({ ethicsStatus })}
          />
          <ChoiceRow label="Expected outputs">
            <div className="flex flex-col gap-2">
              {OUTPUT_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.expectedOutputs.includes(value)}
                    disabled={saved}
                    onChange={() => toggleOutput(value)}
                  />
                  {label}
                </label>
              ))}
              {form.expectedOutputs.includes("other") && (
                <input
                  type="text"
                  value={form.otherOutput}
                  disabled={saved}
                  placeholder="Describe other output"
                  onChange={(event) =>
                    update({ otherOutput: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="Assessment/evaluation method"
            value={form.assessmentMethod}
            disabled={saved}
            multiline
            onChange={(assessmentMethod) => update({ assessmentMethod })}
          />
          <TextRow
            label="Alignment with SMECC2E thematic area"
            value={form.thematicAlignment}
            disabled={saved}
            onChange={(thematicAlignment) => update({ thematicAlignment })}
          />
          <TextRow
            label="Risk/contingency considerations"
            value={form.riskContingency}
            disabled={saved}
            multiline
            onChange={(riskContingency) => update({ riskContingency })}
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Milestones and target dates
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-3 py-2">Milestone</th>
                <th className="border border-slate-300 px-3 py-2">
                  Target date
                </th>
                <th className="border border-slate-300 px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.milestones.map((milestone) => (
                <tr key={milestone.id}>
                  <td className="border border-slate-300 px-3 py-2">
                    <input
                      type="text"
                      value={milestone.description}
                      disabled={saved}
                      onChange={(event) =>
                        updateMilestone(milestone.id, {
                          description: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    <input
                      type="date"
                      value={milestone.targetDate}
                      disabled={saved}
                      onChange={(event) =>
                        updateMilestone(milestone.id, {
                          targetDate: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {!saved && form.milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(milestone.id)}
                        className="text-sm font-semibold text-slate-600 hover:text-[#062763]"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!saved && (
            <button
              type="button"
              onClick={addMilestone}
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another milestone
            </button>
          )}
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Detailed proposal/protocol where applicable"
              checked={form.proposalAttached}
              fileName={form.proposalFileName}
              disabled={saved}
              onCheckedChange={(proposalAttached) =>
                update({
                  proposalAttached,
                  proposalFileName: proposalAttached
                    ? form.proposalFileName
                    : "",
                })
              }
              onFileNameChange={(proposalFileName) =>
                update({ proposalAttached: true, proposalFileName })
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
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
            {
              role: "Host Academic Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Home Academic Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed"
          rows={[
            {
              role: "Coordinator",
              name: "Coordinator",
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
            Research / thesis plan signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign research / thesis plan"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  return (
    <ChoiceRow label={label}>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          rows={3}
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
