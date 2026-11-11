"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I understand that feedback may be used for quality improvement and project monitoring.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type Rating = "" | "0" | "1" | "2" | "3" | "4" | "5";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type RatingKey =
  | "academicSupport"
  | "supervisionMentorship"
  | "facilitiesInfrastructure"
  | "administrativeSupport"
  | "financialSupportAdmin"
  | "integrationWelcome"
  | "healthSafetyWellbeing"
  | "overallSatisfaction";

type FormState = {
  cohort: Cohort;
  ratings: Record<RatingKey, Rating>;
  comments: Record<RatingKey, string>;
  mainPositiveExperience: string;
  mainChallenge: string;
  actionRequested: string;
  suggestionForImprovement: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const RATING_FIELDS: { key: RatingKey; label: string }[] = [
  { key: "academicSupport", label: "Academic support" },
  { key: "supervisionMentorship", label: "Supervision/mentorship" },
  { key: "facilitiesInfrastructure", label: "Facilities/infrastructure" },
  { key: "administrativeSupport", label: "Administrative support" },
  {
    key: "financialSupportAdmin",
    label: "Financial support administration",
  },
  { key: "integrationWelcome", label: "Integration/welcome services" },
  {
    key: "healthSafetyWellbeing",
    label: "Health/safety/wellbeing support",
  },
  { key: "overallSatisfaction", label: "Overall satisfaction" },
];

const EMPTY_RATINGS = RATING_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = "";
    return acc;
  },
  {} as Record<RatingKey, Rating>
);

const EMPTY_COMMENTS = RATING_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = "";
    return acc;
  },
  {} as Record<RatingKey, string>
);

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  ratings: { ...EMPTY_RATINGS },
  comments: { ...EMPTY_COMMENTS },
  mainPositiveExperience: "",
  mainChallenge: "",
  actionRequested: "",
  suggestionForImprovement: "",
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
  return `smecc2e.scholar-feedback-survey-mid-term.${applicationId}`;
}

export function ScholarFeedbackSurveyForm({
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
        setForm({
          ...EMPTY_FORM,
          ratings: { ...EMPTY_RATINGS },
          comments: { ...EMPTY_COMMENTS },
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        ratings: { ...EMPTY_RATINGS, ...parsed.ratings },
        comments: { ...EMPTY_COMMENTS, ...parsed.comments },
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        ratings: { ...EMPTY_RATINGS },
        comments: { ...EMPTY_COMMENTS },
      });
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

  const updateRating = (key: RatingKey, rating: Rating) => {
    update({ ratings: { ...form.ratings, [key]: rating } });
  };

  const updateComment = (key: RatingKey, comment: string) => {
    update({ comments: { ...form.comments, [key]: comment } });
  };

  const sign = () => {
    if (saved) return;
    if (RATING_FIELDS.some((field) => !form.ratings[field.key])) {
      setError("Complete all ratings (0–5).");
      return;
    }
    if (!form.mainPositiveExperience.trim()) {
      setError("Enter the main positive experience.");
      return;
    }
    if (!form.mainChallenge.trim()) {
      setError("Enter the main challenge.");
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
            Scholar periodic feedback / satisfaction survey (mid-term)
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Form code: SUP-07 | Module: Supervision & Progress | Primary user:
            Scholar
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Collect structured feedback for quality improvement during mobility.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="feedback-mid-cohort"
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

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Ratings — 0 to 5
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-3 py-2">
                  Field / item
                </th>
                <th className="border border-slate-300 px-3 py-2">Rating</th>
                <th className="border border-slate-300 px-3 py-2">Comment</th>
              </tr>
            </thead>
            <tbody>
              {RATING_FIELDS.map((field) => (
                <tr key={field.key}>
                  <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
                    {field.label}
                  </th>
                  <td className="border border-slate-300 px-3 py-2">
                    <select
                      value={form.ratings[field.key]}
                      disabled={saved}
                      onChange={(event) =>
                        updateRating(field.key, event.target.value as Rating)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    >
                      <option value="">—</option>
                      {["0", "1", "2", "3", "4", "5"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    <input
                      type="text"
                      value={form.comments[field.key]}
                      disabled={saved}
                      onChange={(event) =>
                        updateComment(field.key, event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <FormTable title="Open feedback">
          <TextRow
            label="Main positive experience"
            value={form.mainPositiveExperience}
            disabled={saved}
            multiline
            onChange={(mainPositiveExperience) =>
              update({ mainPositiveExperience })
            }
          />
          <TextRow
            label="Main challenge"
            value={form.mainChallenge}
            disabled={saved}
            multiline
            onChange={(mainChallenge) => update({ mainChallenge })}
          />
          <TextRow
            label="Action requested"
            value={form.actionRequested}
            disabled={saved}
            multiline
            onChange={(actionRequested) => update({ actionRequested })}
          />
          <TextRow
            label="Suggestion for improvement"
            value={form.suggestionForImprovement}
            disabled={saved}
            multiline
            onChange={(suggestionForImprovement) =>
              update({ suggestionForImprovement })
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
          title="Scholar submission"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />
        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Quality Assurance Officer",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "Host focal Person",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Coordinator",
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
            Mid-term feedback survey signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign mid-term feedback survey"}
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
