"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const SURVEY_POINT_OPTIONS = [
  ["one_year", "1 year"],
  ["three_years", "3 years"],
  ["ad_hoc", "Ad hoc"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type SurveyPoint = (typeof SURVEY_POINT_OPTIONS)[number][0] | "";

type LetterFields = {
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type FormState = {
  cohort: Cohort;
  mobilityCompleted: string;
  surveyPoint: SurveyPoint;
  currentEmploymentStatus: string;
  employerSectorCountry: string;
  furtherStudyStatus: string;
  researchCollaborations: string;
  publicationsInnovationOutputs: string;
  professionalAchievements: string;
  useOfMobilitySkills: string;
  continuedLinks: string;
  alumniEngagement: string;
  overallLongTermImpact: string;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  mobilityCompleted: "",
  surveyPoint: "",
  currentEmploymentStatus: "",
  employerSectorCountry: "",
  furtherStudyStatus: "",
  researchCollaborations: "",
  publicationsInnovationOutputs: "",
  professionalAchievements: "",
  useOfMobilitySkills: "",
  continuedLinks: "",
  alumniEngagement: "",
  overallLongTermImpact: "",
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

function storageKey(applicationId: string): string {
  return `smecc2e.scholar-alumni-tracer-survey.${applicationId}`;
}

export function ScholarAlumniTracerSurveyForm({
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
    if (!form.mobilityCompleted) {
      setError("Enter the mobility completed date.");
      return;
    }
    if (!form.surveyPoint) {
      setError("Select the survey point.");
      return;
    }
    if (!form.currentEmploymentStatus.trim()) {
      setError("Enter the current employment status.");
      return;
    }
    if (!form.employerSectorCountry.trim()) {
      setError("Enter the employer / sector / country.");
      return;
    }
    if (!form.furtherStudyStatus.trim()) {
      setError("Enter the further study status.");
      return;
    }
    if (!form.researchCollaborations.trim()) {
      setError("Enter research collaborations.");
      return;
    }
    if (!form.publicationsInnovationOutputs.trim()) {
      setError("Enter publications / innovation outputs.");
      return;
    }
    if (!form.professionalAchievements.trim()) {
      setError("Enter professional achievements.");
      return;
    }
    if (!form.useOfMobilitySkills.trim()) {
      setError("Enter use of mobility-acquired skills.");
      return;
    }
    if (!form.continuedLinks.trim()) {
      setError("Enter continued links with host/home institutions.");
      return;
    }
    if (!form.alumniEngagement.trim()) {
      setError("Enter SMECC2E/EU alumni engagement.");
      return;
    }
    if (!form.overallLongTermImpact.trim()) {
      setError("Enter the overall long-term impact.");
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
            Scholar alumni / tracer survey form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Former Scholar
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Support one-year and three-year post-mobility impact tracking.
        </p>

        <FormTable title="Alumni record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="alumni-tracer-cohort"
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
          <ReadRow
            label="Mobility start date"
            value={pending(letter?.startDate)}
          />
          <ReadRow
            label="Mobility end date"
            value={pending(letter?.endDate)}
          />
          <TextRow
            label="Mobility completed"
            type="date"
            value={form.mobilityCompleted}
            disabled={saved}
            onChange={(mobilityCompleted) => update({ mobilityCompleted })}
          />
          <ChoiceRow label="Survey point">
            <RadioGroup
              name="alumni-tracer-survey-point"
              value={form.surveyPoint}
              disabled={saved}
              onChange={(surveyPoint) =>
                update({ surveyPoint: surveyPoint as SurveyPoint })
              }
              options={[...SURVEY_POINT_OPTIONS]}
            />
          </ChoiceRow>
        </FormTable>

        <FormTable title="Outcomes">
          <TextRow
            label="Current employment status"
            value={form.currentEmploymentStatus}
            disabled={saved}
            multiline
            rows={3}
            onChange={(currentEmploymentStatus) =>
              update({ currentEmploymentStatus })
            }
          />
          <TextRow
            label="Employer / sector / country"
            value={form.employerSectorCountry}
            disabled={saved}
            multiline
            rows={3}
            onChange={(employerSectorCountry) =>
              update({ employerSectorCountry })
            }
          />
          <TextRow
            label="Further study status"
            value={form.furtherStudyStatus}
            disabled={saved}
            multiline
            rows={3}
            onChange={(furtherStudyStatus) => update({ furtherStudyStatus })}
          />
          <TextRow
            label="Research collaborations"
            value={form.researchCollaborations}
            disabled={saved}
            multiline
            rows={3}
            onChange={(researchCollaborations) =>
              update({ researchCollaborations })
            }
          />
          <TextRow
            label="Publications / innovation outputs"
            value={form.publicationsInnovationOutputs}
            disabled={saved}
            multiline
            rows={3}
            onChange={(publicationsInnovationOutputs) =>
              update({ publicationsInnovationOutputs })
            }
          />
          <TextRow
            label="Professional achievements"
            value={form.professionalAchievements}
            disabled={saved}
            multiline
            rows={3}
            onChange={(professionalAchievements) =>
              update({ professionalAchievements })
            }
          />
          <TextRow
            label="Use of mobility-acquired skills"
            value={form.useOfMobilitySkills}
            disabled={saved}
            multiline
            rows={3}
            onChange={(useOfMobilitySkills) =>
              update({ useOfMobilitySkills })
            }
          />
          <TextRow
            label="Continued links with host/home institutions"
            value={form.continuedLinks}
            disabled={saved}
            multiline
            rows={3}
            onChange={(continuedLinks) => update({ continuedLinks })}
          />
          <TextRow
            label="SMECC2E/EU alumni engagement"
            value={form.alumniEngagement}
            disabled={saved}
            multiline
            rows={3}
            onChange={(alumniEngagement) => update({ alumniEngagement })}
          />
          <TextRow
            label="Overall long-term impact"
            value={form.overallLongTermImpact}
            disabled={saved}
            multiline
            rows={4}
            onChange={(overallLongTermImpact) =>
              update({ overallLongTermImpact })
            }
          />
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
              role: "Former scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
            {
              role: "Project Alumni/QA Team",
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
            Alumni / tracer survey submitted
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Survey submitted" : "Submit alumni / tracer survey"}
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
