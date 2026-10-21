"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The parties confirm that the displayed mobility details correspond to the approved award unless an amendment is formally approved.";

const THEMATIC_AREAS = [
  "Sustainable Energy",
  "Sustainable materials",
  "Energy Policy",
  "Energy Economics",
  "Climate Change",
  "Environment",
] as const;

type ThematicArea = (typeof THEMATIC_AREAS)[number];
type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type SupervisorStatus = "" | "assigned" | "pending";
type YesNo = "" | "yes" | "no";

const THEMATIC_ALIASES: Record<string, ThematicArea> = {
  "sustainable energy": "Sustainable Energy",
  "sustainable materials": "Sustainable materials",
  "sustainable energy materials": "Sustainable materials",
  "energy policy": "Energy Policy",
  "energy policy & regulation": "Energy Policy",
  "energy economics": "Energy Economics",
  "energy economics/energy finance": "Energy Economics",
  "climate change": "Climate Change",
  "climate change studies": "Climate Change",
  environment: "Environment",
  "environmental studies": "Environment",
};

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  areaOfStudy: string;
  focalPerson: string;
  focalEmail: string;
};

type FormState = {
  cohort: Cohort;
  programme: string;
  thematicAreas: ThematicArea[];
  faculty: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  supervisorStatus: SupervisorStatus;
  expectedOutput: string;
  discrepancy: YesNo;
  discrepancyDetails: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  programme: "",
  thematicAreas: [],
  faculty: "",
  hostName: "",
  hostEmail: "",
  hostPhone: "",
  supervisorStatus: "",
  expectedOutput: "",
  discrepancy: "",
  discrepancyDetails: "",
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
  return `smecc2e.mobility.${applicationId}`;
}

function thematicFromRecord(value: string | null | undefined): ThematicArea[] {
  const match = THEMATIC_ALIASES[value?.trim().toLowerCase() ?? ""];
  return match ? [match] : [];
}

function defaultsFromUser(user: ApplicantSessionUser): FormState {
  return {
    ...EMPTY_FORM,
    programme: user.application?.proposedAcademicProgramme?.trim() ?? "",
    thematicAreas: thematicFromRecord(user.application?.thematicArea),
  };
}

export function MobilityDetailsConfirmationForm({
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
    const defaults = defaultsFromUser(user);
    try {
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm(defaults);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({ ...defaults, ...parsed });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm(defaults);
    }
  }, [applicationId, user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/nominee-letter");
        if (!res.ok) return;
        const data = (await res.json()) as {
          letter?: {
            auto?: {
              nationality?: string;
              focalPersonName?: string;
              focalPersonEmail?: string;
            };
            editable?: {
              hostUniversity?: string;
              mobilityType?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
              areaOfStudy?: string;
            };
          };
        };
        if (cancelled || !data.letter) return;
        const next: LetterFields = {
          host: data.letter.editable?.hostUniversity ?? "",
          mobilityType: data.letter.editable?.mobilityType ?? "",
          startDate: data.letter.editable?.mobilityStartDate ?? "",
          endDate: data.letter.editable?.mobilityEndDate ?? "",
          nationality: data.letter.auto?.nationality ?? "",
          areaOfStudy: data.letter.editable?.areaOfStudy ?? "",
          focalPerson: data.letter.auto?.focalPersonName ?? "",
          focalEmail: data.letter.auto?.focalPersonEmail ?? "",
        };
        setLetter(next);
        setForm((current) => {
          if (current.signedAt) return current;
          return {
            ...current,
            programme: current.programme || next.areaOfStudy,
            hostName: current.hostName || next.focalPerson,
            hostEmail: current.hostEmail || next.focalEmail,
          };
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
    setSaved(false);
    setError(null);
    setForm((current) => ({ ...current, ...patch, signature: "", signedAt: "" }));
  };

  const toggleThematic = (area: ThematicArea) => {
    update({
      thematicAreas: form.thematicAreas.includes(area)
        ? form.thematicAreas.filter((item) => item !== area)
        : [...form.thematicAreas, area],
    });
  };

  const sign = () => {
    if (!form.programme.trim()) {
      setError("Enter the programme or field of education.");
      return;
    }
    if (form.thematicAreas.length === 0) {
      setError("Select at least one SMECC2E thematic area.");
      return;
    }
    if (!form.faculty.trim()) {
      setError("Enter the faculty, department, or unit.");
      return;
    }
    if (!form.hostName.trim() || !form.hostEmail.trim()) {
      setError("Enter the host contact name and email.");
      return;
    }
    if (!form.supervisorStatus) {
      setError("Say whether an academic supervisor or mentor is assigned.");
      return;
    }
    if (!form.expectedOutput.trim()) {
      setError("Enter the expected qualification or mobility output.");
      return;
    }
    if (!form.discrepancy) {
      setError("Say whether any detail differs from the award record.");
      return;
    }
    if (form.discrepancy === "yes" && !form.discrepancyDetails.trim()) {
      setError("Describe the discrepancy from the award record.");
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
      setError("The confirmation was signed in this session, but it could not be stored in this browser.");
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
          <p className="text-[11px] font-semibold leading-5 text-white/80">{GRANT_LINE}</p>
          <h1 className="mt-3 text-lg font-bold tracking-wide sm:text-xl">
            Mobility details confirmation form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Confirm the approved mobility configuration before pre-departure processing.
        </p>

        <FormTable title="Mobility record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="mobility-cohort"
              value={form.cohort}
              onChange={(cohort) => update({ cohort: cohort as Cohort })}
              options={[
                ["cohort-1", "Cohort 1"],
                ["cohort-2", "Cohort 2"],
                ["cohort-3", "Cohort 3"],
              ]}
            />
          </ChoiceRow>
          <ReadRow label="Applicant / scholar ID" value={pending(app?.publicId || app?.id)} />
          <ReadRow label="Full names" value={fullName} />
          <ReadRow label="Gender" value={pending(app?.gender)} />
          <ReadRow label="Nationality" value={pending(letter?.nationality || app?.nationality)} />
          <ReadRow label="Mobility category" value={mobilityCategory(mobilitySource)} />
          <ReadRow label="Mobility type" value={mobilityKind(mobilitySource)} />
          <ReadRow
            label="Home institution"
            value={pending(homeInstitution === "—" ? "" : homeInstitution)}
          />
          <ReadRow
            label="Host institution / organization"
            value={pending(letter?.host || app?.preferredHostInstitution)}
          />
          <ReadRow label="Mobility start date" value={pending(letter?.startDate)} />
          <ReadRow label="Mobility end date" value={pending(letter?.endDate)} />
        </FormTable>

        <FormTable title="Confirmed details">
          <TextRow
            label="Programme / field of education"
            value={form.programme}
            onChange={(programme) => update({ programme })}
          />
          <ChoiceRow label="Thematic area">
            <p className="mb-2 text-sm text-slate-600">
              Select as many SMECC2E thematic areas that applies
            </p>
            <div className="flex flex-col gap-2">
              {THEMATIC_AREAS.map((area) => (
                <label key={area} className="inline-flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.thematicAreas.includes(area)}
                    onChange={() => toggleThematic(area)}
                  />
                  {area}
                </label>
              ))}
            </div>
          </ChoiceRow>
          <TextRow
            label="Faculty/department/unit"
            value={form.faculty}
            onChange={(faculty) => update({ faculty })}
          />
          <ChoiceRow label="Host contact/focal person">
            <div className="grid gap-2">
              <input
                type="text"
                value={form.hostName}
                placeholder="Name"
                onChange={(event) => update({ hostName: event.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
              <input
                type="email"
                value={form.hostEmail}
                placeholder="Email"
                onChange={(event) => update({ hostEmail: event.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
              <input
                type="text"
                value={form.hostPhone}
                placeholder="Phone"
                onChange={(event) => update({ hostPhone: event.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
            </div>
          </ChoiceRow>
          <ChoiceRow label="Academic supervisor / mentor status">
            <RadioGroup
              name="supervisor-status"
              value={form.supervisorStatus}
              onChange={(supervisorStatus) =>
                update({ supervisorStatus: supervisorStatus as SupervisorStatus })
              }
              options={[
                ["assigned", "Assigned"],
                ["pending", "Pending"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Expected qualification or mobility output"
            value={form.expectedOutput}
            onChange={(expectedOutput) => update({ expectedOutput })}
          />
          <ChoiceRow label="Any discrepancy from award record">
            <RadioGroup
              name="mobility-discrepancy"
              value={form.discrepancy}
              onChange={(discrepancy) =>
                update({
                  discrepancy: discrepancy as YesNo,
                  discrepancyDetails: discrepancy === "yes" ? form.discrepancyDetails : "",
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
            {form.discrepancy === "yes" && (
              <textarea
                value={form.discrepancyDetails}
                rows={3}
                placeholder="Details"
                onChange={(event) => update({ discrepancyDetails: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
            )}
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            No mandatory attachment unless triggered by the form or requested by an authorised reviewer.
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
              onChange={(event) => update({ declared: event.target.checked })}
              className="mt-1"
            />
            <span>{DECLARATION}</span>
          </label>
        </section>

        <SignTable
          title="Sign"
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
              role: "Host focal person",
              name: pending(letter?.focalPerson || form.hostName),
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "SMECC2E coordinator",
              name: "SMECC2E coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
            Mobility details signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580]"
        >
          Sign confirmation
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
            <th className="w-[42%] border border-slate-300 px-3 py-2">Field / item</th>
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
      <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">{value}</td>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <tr>
      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
      </td>
    </tr>
  );
}

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map(([optionValue, label]) => (
        <label key={optionValue} className="inline-flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={value === optionValue}
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
            <th className="border border-slate-300 px-3 py-2">Decision / signature</th>
            <th className="border border-slate-300 px-3 py-2">Date / timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.role}`}>
              <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
                {row.role}
              </th>
              <td className="border border-slate-300 px-3 py-2">{row.name}</td>
              <td className="border border-slate-300 px-3 py-2">{row.signature}</td>
              <td className="border border-slate-300 px-3 py-2">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
