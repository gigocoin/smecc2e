"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the activity log is a true record of my placement participation.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type SupervisorDecision = "" | "accept" | "reject";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type WeeklyLog = {
  reportNo: string;
  fillDate: string;
  fromDate: string;
  toDate: string;
  attendanceHours: string;
  activityTask: string;
  outputEvidence: string;
  learningOutcome: string;
  scholarComments: string;
  supervisorDecision: SupervisorDecision;
  supervisorComments: string;
  taskEvidenceAttached: boolean;
  taskEvidenceFileName: string;
  photosAttached: boolean;
  photosFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

type FormState = {
  cohort: Cohort;
  logs: WeeklyLog[];
  draft: WeeklyLog;
};

function padReport(n: number): string {
  return String(n).padStart(2, "0");
}

function emptyDraft(reportNo: string): WeeklyLog {
  return {
    reportNo,
    fillDate: "",
    fromDate: "",
    toDate: "",
    attendanceHours: "",
    activityTask: "",
    outputEvidence: "",
    learningOutcome: "",
    scholarComments: "",
    supervisorDecision: "",
    supervisorComments: "",
    taskEvidenceAttached: false,
    taskEvidenceFileName: "",
    photosAttached: false,
    photosFileName: "",
    declared: false,
    signature: "",
    signedAt: "",
  };
}

function buildReportNo(scholarId: string, weekNumber: number): string {
  const id = scholarId.trim() || "SCHOLAR";
  return `${id} – REP – ${padReport(weekNumber)}`;
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

function mobilityKind(type: string): string {
  if (/staff/i.test(type)) return "Staff";
  if (/trainee/i.test(type)) return "Traineeship";
  if (/credit/i.test(type)) return "Credit-Seeking";
  if (/degree/i.test(type)) return "Degree-Seeking";
  return pending(type);
}

function storageKey(applicationId: string): string {
  return `smecc2e.internship-weekly-attendance.${applicationId}`;
}

export function InternshipWeeklyAttendanceForm({
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
    logs: [],
    draft: emptyDraft(buildReportNo(scholarId, 1)),
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({
          cohort: "cohort-1",
          logs: [],
          draft: emptyDraft(buildReportNo(scholarId, 1)),
        });
        setSaved(false);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      const logs = parsed.logs ?? [];
      const draft =
        parsed.draft && !parsed.draft.signedAt
          ? {
              ...emptyDraft(buildReportNo(scholarId, logs.length + 1)),
              ...parsed.draft,
              reportNo: buildReportNo(scholarId, logs.length + 1),
            }
          : emptyDraft(buildReportNo(scholarId, logs.length + 1));
      setForm({
        cohort: parsed.cohort ?? "cohort-1",
        logs,
        draft,
      });
      setSaved(Boolean(parsed.draft?.signedAt));
    } catch {
      setForm({
        cohort: "cohort-1",
        logs: [],
        draft: emptyDraft(buildReportNo(scholarId, 1)),
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

  const persist = (next: FormState) => {
    try {
      localStorage.setItem(storageKey(applicationId), JSON.stringify(next));
    } catch {
      setError(
        "The form was updated in this session, but it could not be stored in this browser."
      );
    }
  };

  const updateDraft = (patch: Partial<WeeklyLog>) => {
    if (saved) return;
    setError(null);
    setForm((current) => {
      const next = {
        ...current,
        draft: {
          ...current.draft,
          ...patch,
          signature: "",
          signedAt: "",
        },
      };
      return next;
    });
  };

  const updateCohort = (cohort: Cohort) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({ ...current, cohort }));
  };

  const sign = () => {
    if (saved) return;
    if (!form.draft.fillDate) {
      setError("Enter the date you are filling the log.");
      return;
    }
    if (!form.draft.fromDate || !form.draft.toDate) {
      setError("Enter the attendance from and to dates.");
      return;
    }
    if (!form.draft.attendanceHours.trim()) {
      setError("Enter the attendance hours or days covered.");
      return;
    }
    if (!form.draft.activityTask.trim()) {
      setError("Enter the activity / task undertaken.");
      return;
    }
    if (!form.draft.declared) {
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
    const signedDraft: WeeklyLog = {
      ...form.draft,
      reportNo: buildReportNo(scholarId, form.logs.length + 1),
      signature: fullName,
      signedAt,
      supervisorDecision: "",
      supervisorComments: form.draft.supervisorComments,
    };
    const next: FormState = {
      ...form,
      draft: signedDraft,
      logs: [...form.logs, signedDraft],
    };
    setForm(next);
    setSaved(true);
    setError(null);
    persist(next);
  };

  const startNextWeek = () => {
    const nextDraft = emptyDraft(buildReportNo(scholarId, form.logs.length + 1));
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
            Weekly attendance / placement activity log
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Participant + Workplace supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Maintain an auditable record of attendance, activities and learning
          evidence throughout the placement.
        </p>

        <FormTable title="Participant / placement record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="weekly-attendance-cohort"
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
          <ReadRow label="Mobility type" value={mobilityKind(mobilitySource)} />
          <ReadRow
            label="Home institution"
            value={pending(homeInstitution === "—" ? "" : homeInstitution)}
          />
          <ReadRow
            label="Host institution / organisation"
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

        {form.logs.length > 0 && (
          <section className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
                Submitted weekly logs
              </caption>
              <thead>
                <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="border border-slate-300 px-3 py-2">
                    Weekly report No.
                  </th>
                  <th className="border border-slate-300 px-3 py-2">Period</th>
                  <th className="border border-slate-300 px-3 py-2">
                    Scholar signed
                  </th>
                  <th className="border border-slate-300 px-3 py-2">
                    Supervisor
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.logs.map((log) => (
                  <tr key={`${log.reportNo}-${log.signedAt}`}>
                    <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
                      {log.reportNo}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {log.fromDate || "—"} to {log.toDate || "—"}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {log.signedAt || "Pending"}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {log.supervisorDecision === "accept"
                        ? "Accepted"
                        : log.supervisorDecision === "reject"
                          ? "Rejected"
                          : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <FormTable title="Weekly activity log entry by the scholar">
          <ReadRow
            label="Weekly report No."
            value={
              saved
                ? form.draft.reportNo
                : buildReportNo(scholarId, form.logs.length + 1)
            }
          />
          <TextRow
            label="Date (you are filling the log). Preferably last day of the reporting week."
            type="date"
            value={form.draft.fillDate}
            disabled={saved}
            onChange={(fillDate) => updateDraft({ fillDate })}
          />
          <TextRow
            label="Attendance from date"
            type="date"
            value={form.draft.fromDate}
            disabled={saved}
            onChange={(fromDate) => updateDraft({ fromDate })}
          />
          <TextRow
            label="Attendance to date"
            type="date"
            value={form.draft.toDate}
            disabled={saved}
            onChange={(toDate) => updateDraft({ toDate })}
          />
          <TextRow
            label="Attendance / hours or days covered"
            value={form.draft.attendanceHours}
            disabled={saved}
            onChange={(attendanceHours) => updateDraft({ attendanceHours })}
          />
          <TextRow
            label="Activity / task undertaken"
            value={form.draft.activityTask}
            disabled={saved}
            multiline
            onChange={(activityTask) => updateDraft({ activityTask })}
          />
          <TextRow
            label="Output / evidence produced"
            value={form.draft.outputEvidence}
            disabled={saved}
            multiline
            onChange={(outputEvidence) => updateDraft({ outputEvidence })}
          />
          <TextRow
            label="Learning outcome / competency addressed"
            value={form.draft.learningOutcome}
            disabled={saved}
            multiline
            onChange={(learningOutcome) => updateDraft({ learningOutcome })}
          />
          <TextRow
            label="Supervisor comments / verification (scholar notes)"
            value={form.draft.scholarComments}
            disabled={saved}
            multiline
            onChange={(scholarComments) => updateDraft({ scholarComments })}
          />
        </FormTable>

        <FormTable title="Weekly activity log entry by the workplace supervisor">
          <ReadRow label="Decision" value="Pending — Reject and return / Accept" />
          <ReadRow
            label="Supervisor comments / verification"
            value="Pending"
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (upload)
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Task evidence where required and permitted"
              checked={form.draft.taskEvidenceAttached}
              fileName={form.draft.taskEvidenceFileName}
              disabled={saved}
              onCheckedChange={(taskEvidenceAttached) =>
                updateDraft({
                  taskEvidenceAttached,
                  taskEvidenceFileName: taskEvidenceAttached
                    ? form.draft.taskEvidenceFileName
                    : "",
                })
              }
              onFileNameChange={(taskEvidenceFileName) =>
                updateDraft({
                  taskEvidenceAttached: true,
                  taskEvidenceFileName,
                })
              }
            />
            <AttachmentRow
              label="Photographs of you in action and your instructors/supervisors"
              checked={form.draft.photosAttached}
              fileName={form.draft.photosFileName}
              disabled={saved}
              onCheckedChange={(photosAttached) =>
                updateDraft({
                  photosAttached,
                  photosFileName: photosAttached
                    ? form.draft.photosFileName
                    : "",
                })
              }
              onFileNameChange={(photosFileName) =>
                updateDraft({ photosAttached: true, photosFileName })
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
              checked={form.draft.declared}
              disabled={saved}
              onChange={(event) =>
                updateDraft({ declared: event.target.checked })
              }
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
              signature: form.draft.signature || "Awaiting signature",
              date: form.draft.signedAt || "Awaiting signature",
            },
            {
              role: "Workplace Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewable & downloadable by"
          rows={[
            {
              role: "SMECC2E Coordinator",
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
              role: "Quality Assurance officer",
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
            Weekly attendance log signed
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
            {saved ? "Week signed" : "Sign weekly attendance log"}
          </button>
          {saved && (
            <button
              type="button"
              onClick={startNextWeek}
              className="inline-flex rounded-lg border border-[#062763] px-5 py-2.5 text-sm font-semibold text-[#062763] transition hover:bg-slate-50"
            >
              Start next weekly log
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
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
