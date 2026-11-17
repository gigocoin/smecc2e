"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that this is my final mobility report and that the information is accurate.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type FormState = {
  cohort: Cohort;
  activitiesCompleted: string;
  creditsOutputs: string;
  skillsCompetencies: string;
  researchOutputs: string;
  challengesMitigation: string;
  thematicContribution: string;
  hostSupportFeedback: string;
  outcomesLessons: string;
  dissemination: string;
  transcriptAttached: boolean;
  transcriptFileName: string;
  publicationsAttached: boolean;
  publicationsFileName: string;
  thesisAttached: boolean;
  thesisFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  activitiesCompleted: "",
  creditsOutputs: "",
  skillsCompetencies: "",
  researchOutputs: "",
  challengesMitigation: "",
  thematicContribution: "",
  hostSupportFeedback: "",
  outcomesLessons: "",
  dissemination: "",
  transcriptAttached: false,
  transcriptFileName: "",
  publicationsAttached: false,
  publicationsFileName: "",
  thesisAttached: false,
  thesisFileName: "",
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
  return `smecc2e.final-mobility-academic-report.${applicationId}`;
}

export function FinalMobilityAcademicReportForm({
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
    if (!form.activitiesCompleted.trim()) {
      setError("Describe activities / courses / research / training completed.");
      return;
    }
    if (!form.creditsOutputs.trim()) {
      setError("Enter credits / outputs achieved.");
      return;
    }
    if (!form.skillsCompetencies.trim()) {
      setError("Enter skills and competencies acquired.");
      return;
    }
    if (!form.researchOutputs.trim()) {
      setError("Enter research outputs / deliverables.");
      return;
    }
    if (!form.challengesMitigation.trim()) {
      setError("Enter challenges and mitigation.");
      return;
    }
    if (!form.thematicContribution.trim()) {
      setError("Enter contribution to the SMECC2E thematic area.");
      return;
    }
    if (!form.hostSupportFeedback.trim()) {
      setError("Enter host support / facilities / supervision feedback.");
      return;
    }
    if (!form.outcomesLessons.trim()) {
      setError("Enter overall outcomes and lessons learned.");
      return;
    }
    if (!form.dissemination.trim()) {
      setError("Enter dissemination / visibility undertaken.");
      return;
    }
    if (!form.declared) {
      setError("Confirm the declaration before signing.");
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
            Final mobility / academic &amp; supervisor approval report form
          </h1>
          <p className="mt-2 text-sm text-white/80">Primary user: Scholar</p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Capture the final narrative required at the end of mobility, aligned
          to the academic monitoring structure. Host Academic Supervisor review
          remains Pending until completed by authorised staff.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="fmar-cohort"
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

        <FormTable title="Final report (by student)">
          <TextRow
            label="Activities / courses / research / training completed"
            value={form.activitiesCompleted}
            disabled={saved}
            multiline
            rows={4}
            onChange={(activitiesCompleted) => update({ activitiesCompleted })}
          />
          <TextRow
            label="Credits / outputs achieved"
            value={form.creditsOutputs}
            disabled={saved}
            multiline
            rows={3}
            onChange={(creditsOutputs) => update({ creditsOutputs })}
          />
          <TextRow
            label="Skills and competencies acquired"
            value={form.skillsCompetencies}
            disabled={saved}
            multiline
            rows={3}
            onChange={(skillsCompetencies) => update({ skillsCompetencies })}
          />
          <TextRow
            label="Research outputs / deliverables"
            value={form.researchOutputs}
            disabled={saved}
            multiline
            rows={3}
            onChange={(researchOutputs) => update({ researchOutputs })}
          />
          <TextRow
            label="Challenges and mitigation"
            value={form.challengesMitigation}
            disabled={saved}
            multiline
            rows={3}
            onChange={(challengesMitigation) =>
              update({ challengesMitigation })
            }
          />
          <TextRow
            label="Contribution to SMECC2E thematic area"
            value={form.thematicContribution}
            disabled={saved}
            multiline
            rows={3}
            onChange={(thematicContribution) =>
              update({ thematicContribution })
            }
          />
          <TextRow
            label="Host support / facilities / supervision feedback"
            value={form.hostSupportFeedback}
            disabled={saved}
            multiline
            rows={3}
            onChange={(hostSupportFeedback) => update({ hostSupportFeedback })}
          />
          <TextRow
            label="Overall outcomes and lessons learned"
            value={form.outcomesLessons}
            disabled={saved}
            multiline
            rows={3}
            onChange={(outcomesLessons) => update({ outcomesLessons })}
          />
          <TextRow
            label="Dissemination / visibility undertaken"
            value={form.dissemination}
            disabled={saved}
            multiline
            rows={3}
            onChange={(dissemination) => update({ dissemination })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Transcript / certificate / research outputs where applicable"
              checked={form.transcriptAttached}
              fileName={form.transcriptFileName}
              disabled={saved}
              onCheckedChange={(transcriptAttached) =>
                update({
                  transcriptAttached,
                  transcriptFileName: transcriptAttached
                    ? form.transcriptFileName
                    : "",
                })
              }
              onFileNameChange={(transcriptFileName) =>
                update({ transcriptAttached: true, transcriptFileName })
              }
            />
            <AttachmentRow
              label="Publications / conference papers in one PDF"
              checked={form.publicationsAttached}
              fileName={form.publicationsFileName}
              disabled={saved}
              onCheckedChange={(publicationsAttached) =>
                update({
                  publicationsAttached,
                  publicationsFileName: publicationsAttached
                    ? form.publicationsFileName
                    : "",
                })
              }
              onFileNameChange={(publicationsFileName) =>
                update({ publicationsAttached: true, publicationsFileName })
              }
            />
            <AttachmentRow
              label="Thesis report in PDF"
              checked={form.thesisAttached}
              fileName={form.thesisFileName}
              disabled={saved}
              onCheckedChange={(thesisAttached) =>
                update({
                  thesisAttached,
                  thesisFileName: thesisAttached ? form.thesisFileName : "",
                })
              }
              onFileNameChange={(thesisFileName) =>
                update({ thesisAttached: true, thesisFileName })
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
          ]}
        />

        <FormTable title="Review by Host Academic Supervisor">
          <ReadRow
            label="Objectives achieved"
            value="Pending — Yes / Partly / No"
          />
          <ReadRow label="Outputs verified" value="Pending — Yes / No / N/A" />
          <ReadRow
            label="Outstanding academic issue"
            value="Pending — None / Details"
          />
          <ReadRow
            label="Recommendation"
            value="Pending — Approve / Return for revision / Escalate"
          />
          <ReadRow label="Comments" value="Pending" />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (supervisor review)
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            No mandatory attachment unless triggered by the form or requested by
            an authorised reviewer.
          </p>
        </section>

        <SignTable
          title="Host supervisor approval / sign-off"
          rows={[
            {
              role: "Host Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Host Supervisor review",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <ViewedTable
          title="Viewed by"
          rows={[
            { role: "SMECC2E Coordinator", name: "Pending", date: "Pending" },
            { role: "Host Academic Supervisor", name: "Pending", date: "Pending" },
            { role: "Home Academic Supervisor", name: "Pending", date: "Pending" },
            {
              role: "Scholar",
              name: fullName,
              date: form.signedAt || "Awaiting signature",
            },
            { role: "Host Finance Officer", name: "Pending", date: "Pending" },
            {
              role: "Coordinator finance officer",
              name: "Pending",
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
            Final mobility report signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Report signed" : "Sign final mobility report"}
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

function ViewedTable({
  title,
  rows,
}: {
  title: string;
  rows: { role: string; name: string; date: string }[];
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
              <td className="border border-slate-300 px-3 py-2">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
