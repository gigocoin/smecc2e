"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const MILESTONE_STATUS_OPTIONS = [
  ["not_started", "Not started"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
] as const;

const ETHICS_STATUS_OPTIONS = [
  ...MILESTONE_STATUS_OPTIONS,
  ["na", "N/A"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type MilestoneStatus = (typeof MILESTONE_STATUS_OPTIONS)[number][0] | "";
type EthicsStatus = (typeof ETHICS_STATUS_OPTIONS)[number][0] | "";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type FormState = {
  cohort: Cohort;
  title: string;
  proposalApprovalDate: string;
  proposalApprovalStatus: MilestoneStatus;
  ethicsApprovalDate: string;
  ethicsApprovalStatus: EthicsStatus;
  literatureReviewPercent: string;
  literatureReviewStatus: MilestoneStatus;
  dataCollectionPercent: string;
  dataCollectionStatus: MilestoneStatus;
  analysisPercent: string;
  analysisStatus: MilestoneStatus;
  draftChaptersStatus: string;
  seminarPresentationStatus: string;
  seminarPresentationDate: string;
  submissionTarget: string;
  defenceVivaTarget: string;
  keyRisk: string;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  title: "",
  proposalApprovalDate: "",
  proposalApprovalStatus: "",
  ethicsApprovalDate: "",
  ethicsApprovalStatus: "",
  literatureReviewPercent: "",
  literatureReviewStatus: "",
  dataCollectionPercent: "",
  dataCollectionStatus: "",
  analysisPercent: "",
  analysisStatus: "",
  draftChaptersStatus: "",
  seminarPresentationStatus: "",
  seminarPresentationDate: "",
  submissionTarget: "",
  defenceVivaTarget: "",
  keyRisk: "",
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
  return `smecc2e.thesis-dissertation-progress.${applicationId}`;
}

export function ThesisDissertationProgressForm({
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
        setForm(EMPTY_FORM);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({ ...EMPTY_FORM, ...parsed });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm(EMPTY_FORM);
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

  const sign = () => {
    if (saved) return;
    if (!form.title.trim()) {
      setError("Enter the thesis / dissertation title.");
      return;
    }
    if (!form.proposalApprovalStatus) {
      setError("Select the proposal approval status.");
      return;
    }
    if (!form.ethicsApprovalStatus) {
      setError("Select the ethics approval status.");
      return;
    }
    if (!form.literatureReviewStatus) {
      setError("Select the literature review status.");
      return;
    }
    if (!form.dataCollectionStatus) {
      setError("Select the data collection status.");
      return;
    }
    if (!form.analysisStatus) {
      setError("Select the analysis status.");
      return;
    }
    if (!form.draftChaptersStatus.trim()) {
      setError("Enter the draft chapters status.");
      return;
    }
    if (!form.submissionTarget) {
      setError("Enter the submission target date.");
      return;
    }
    if (!form.defenceVivaTarget) {
      setError("Enter the defence / viva target date.");
      return;
    }
    if (!form.keyRisk.trim()) {
      setError("Enter the key risk.");
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
            Thesis / dissertation progress form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Degree-Seeking Scholar + Supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Track thesis/dissertation milestones for degree-seeking scholars.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="thesis-progress-cohort"
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

        <FormTable title="Thesis progress">
          <TextRow
            label="Title"
            value={form.title}
            disabled={saved}
            multiline
            rows={2}
            onChange={(title) => update({ title })}
          />
          <DateStatusRow
            label="Proposal approval"
            date={form.proposalApprovalDate}
            status={form.proposalApprovalStatus}
            disabled={saved}
            statusOptions={[...MILESTONE_STATUS_OPTIONS]}
            statusName="thesis-proposal-status"
            onDateChange={(proposalApprovalDate) =>
              update({ proposalApprovalDate })
            }
            onStatusChange={(proposalApprovalStatus) =>
              update({
                proposalApprovalStatus:
                  proposalApprovalStatus as MilestoneStatus,
              })
            }
          />
          <DateStatusRow
            label="Ethics approval"
            date={form.ethicsApprovalDate}
            status={form.ethicsApprovalStatus}
            disabled={saved}
            statusOptions={[...ETHICS_STATUS_OPTIONS]}
            statusName="thesis-ethics-status"
            onDateChange={(ethicsApprovalDate) =>
              update({ ethicsApprovalDate })
            }
            onStatusChange={(ethicsApprovalStatus) =>
              update({
                ethicsApprovalStatus: ethicsApprovalStatus as EthicsStatus,
              })
            }
          />
          <PercentStatusRow
            label="Literature review"
            percent={form.literatureReviewPercent}
            status={form.literatureReviewStatus}
            disabled={saved}
            statusName="thesis-literature-status"
            onPercentChange={(literatureReviewPercent) =>
              update({ literatureReviewPercent })
            }
            onStatusChange={(literatureReviewStatus) =>
              update({
                literatureReviewStatus:
                  literatureReviewStatus as MilestoneStatus,
              })
            }
          />
          <PercentStatusRow
            label="Data collection"
            percent={form.dataCollectionPercent}
            status={form.dataCollectionStatus}
            disabled={saved}
            statusName="thesis-data-status"
            onPercentChange={(dataCollectionPercent) =>
              update({ dataCollectionPercent })
            }
            onStatusChange={(dataCollectionStatus) =>
              update({
                dataCollectionStatus: dataCollectionStatus as MilestoneStatus,
              })
            }
          />
          <PercentStatusRow
            label="Analysis"
            percent={form.analysisPercent}
            status={form.analysisStatus}
            disabled={saved}
            statusName="thesis-analysis-status"
            onPercentChange={(analysisPercent) => update({ analysisPercent })}
            onStatusChange={(analysisStatus) =>
              update({ analysisStatus: analysisStatus as MilestoneStatus })
            }
          />
          <TextRow
            label="Draft chapters"
            value={form.draftChaptersStatus}
            disabled={saved}
            onChange={(draftChaptersStatus) =>
              update({ draftChaptersStatus })
            }
          />
          <ChoiceRow label="Seminar / presentation">
            <div className="space-y-3">
              <input
                type="text"
                value={form.seminarPresentationStatus}
                disabled={saved}
                placeholder="Status"
                onChange={(event) =>
                  update({ seminarPresentationStatus: event.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
              <input
                type="date"
                value={form.seminarPresentationDate}
                disabled={saved}
                onChange={(event) =>
                  update({ seminarPresentationDate: event.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
            </div>
          </ChoiceRow>
          <TextRow
            label="Submission target"
            type="date"
            value={form.submissionTarget}
            disabled={saved}
            onChange={(submissionTarget) => update({ submissionTarget })}
          />
          <TextRow
            label="Defence / viva target"
            type="date"
            value={form.defenceVivaTarget}
            disabled={saved}
            onChange={(defenceVivaTarget) => update({ defenceVivaTarget })}
          />
          <TextRow
            label="Key risk"
            value={form.keyRisk}
            disabled={saved}
            multiline
            rows={4}
            onChange={(keyRisk) => update({ keyRisk })}
          />
          <ReadRow label="Supervisor recommendation" value="Pending" />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            No mandatory attachment unless triggered by the form or requested by
            an authorised reviewer.
          </p>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Scholar acknowledgement",
              name: fullName,
              signature: form.signature || "Awaiting acknowledgement",
              date: form.signedAt || "Awaiting acknowledgement",
            },
            {
              role: "Host Supervisor",
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
            {
              role: "SMECC2E Coordinator",
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
            Thesis / dissertation progress submitted
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
            ? "Progress submitted"
            : "Submit thesis / dissertation progress"}
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

function DateStatusRow({
  label,
  date,
  status,
  disabled,
  statusOptions,
  statusName,
  onDateChange,
  onStatusChange,
}: {
  label: string;
  date: string;
  status: string;
  disabled: boolean;
  statusOptions: [string, string][];
  statusName: string;
  onDateChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <ChoiceRow label={label}>
      <div className="space-y-3">
        <input
          type="date"
          value={date}
          disabled={disabled}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
        <RadioGroup
          name={statusName}
          value={status}
          disabled={disabled}
          onChange={onStatusChange}
          options={statusOptions}
        />
      </div>
    </ChoiceRow>
  );
}

function PercentStatusRow({
  label,
  percent,
  status,
  disabled,
  statusName,
  onPercentChange,
  onStatusChange,
}: {
  label: string;
  percent: string;
  status: string;
  disabled: boolean;
  statusName: string;
  onPercentChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  return (
    <ChoiceRow label={label}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={percent}
            disabled={disabled}
            onChange={(event) => onPercentChange(event.target.value)}
            className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
          />
          <span className="text-sm font-semibold text-[#062763]">%</span>
        </div>
        <RadioGroup
          name={statusName}
          value={status}
          disabled={disabled}
          onChange={onStatusChange}
          options={[...MILESTONE_STATUS_OPTIONS]}
        />
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
      {options.map(([optionValue, optionLabel]) => (
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
          {optionLabel}
        </label>
      ))}
    </div>
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
