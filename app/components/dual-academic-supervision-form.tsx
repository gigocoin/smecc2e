"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const HOME_RESPONSIBILITIES =
  "Ensure alignment; support reintegration; confirm credit transfer/recognition";

const HOST_RESPONSIBILITIES =
  "Guide activities; monitor day-to-day performance; submit evaluations";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  focalPerson: string;
};

type SupervisorFields = {
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  assignmentDate: string;
  responsibilitiesAcknowledged: boolean;
};

type FormState = {
  cohort: Cohort;
  home1: SupervisorFields;
  home2: SupervisorFields;
  signature: string;
  signedAt: string;
};

const EMPTY_SUPERVISOR: SupervisorFields = {
  name: "",
  title: "",
  department: "",
  email: "",
  phone: "",
  assignmentDate: "",
  responsibilitiesAcknowledged: false,
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  home1: { ...EMPTY_SUPERVISOR },
  home2: { ...EMPTY_SUPERVISOR },
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
  return `smecc2e.dual-supervision.${applicationId}`;
}

export function DualAcademicSupervisionForm({
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
          home1: { ...EMPTY_SUPERVISOR },
          home2: { ...EMPTY_SUPERVISOR },
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        home1: { ...EMPTY_SUPERVISOR, ...parsed.home1 },
        home2: { ...EMPTY_SUPERVISOR, ...parsed.home2 },
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        home1: { ...EMPTY_SUPERVISOR },
        home2: { ...EMPTY_SUPERVISOR },
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
            auto?: { nationality?: string; focalPersonName?: string };
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
          focalPerson: data.letter.auto?.focalPersonName ?? "",
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
  const isCreditSeeking = /credit/i.test(mobilitySource);
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

  const updateHome = (
    key: "home1" | "home2",
    patch: Partial<SupervisorFields>
  ) => {
    update({ [key]: { ...form[key], ...patch } });
  };

  const acknowledge = () => {
    if (saved) return;
    if (isCreditSeeking) {
      if (!form.home1.name.trim()) {
        setError("Enter Home Academic Supervisor 1 name.");
        return;
      }
      if (!form.home1.email.trim()) {
        setError("Enter Home Academic Supervisor 1 email.");
        return;
      }
      if (!form.home1.responsibilitiesAcknowledged) {
        setError(
          "Acknowledge Home Academic Supervisor 1 responsibilities."
        );
        return;
      }
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
        "The form was acknowledged in this session, but it could not be stored in this browser."
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
            Dual academic supervision assignment form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Scholar, Host HEI + Home HEI
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Assign the Host Academic Supervisor and Home Academic Supervisor(s)
          required by the monitoring framework.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="dual-supervision-cohort"
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

        <FormTable title="Home Academic Supervisor 1 (filled by the scholar for credit seeking scholars only)">
          <TextRow
            label="Name"
            value={form.home1.name}
            disabled={saved}
            onChange={(name) => updateHome("home1", { name })}
          />
          <TextRow
            label="Title/position"
            value={form.home1.title}
            disabled={saved}
            onChange={(title) => updateHome("home1", { title })}
          />
          <TextRow
            label="Department"
            value={form.home1.department}
            disabled={saved}
            onChange={(department) => updateHome("home1", { department })}
          />
          <TextRow
            label="Email"
            type="email"
            value={form.home1.email}
            disabled={saved}
            onChange={(email) => updateHome("home1", { email })}
          />
          <TextRow
            label="Phone (WhatsApp preferable)"
            value={form.home1.phone}
            disabled={saved}
            onChange={(phone) => updateHome("home1", { phone })}
          />
          <TextRow
            label="Assignment date"
            type="date"
            value={form.home1.assignmentDate}
            disabled={saved}
            onChange={(assignmentDate) =>
              updateHome("home1", { assignmentDate })
            }
          />
          <ChoiceRow label="Responsibilities acknowledged">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={form.home1.responsibilitiesAcknowledged}
                disabled={saved}
                onChange={(event) =>
                  updateHome("home1", {
                    responsibilitiesAcknowledged: event.target.checked,
                  })
                }
                className="mt-1"
              />
              <span>{HOME_RESPONSIBILITIES}</span>
            </label>
          </ChoiceRow>
        </FormTable>

        <FormTable title="Home Academic Supervisor 2 (filled by the scholar for credit seeking scholars only)">
          <TextRow
            label="Name"
            value={form.home2.name}
            disabled={saved}
            onChange={(name) => updateHome("home2", { name })}
          />
          <TextRow
            label="Title/position"
            value={form.home2.title}
            disabled={saved}
            onChange={(title) => updateHome("home2", { title })}
          />
          <TextRow
            label="Department"
            value={form.home2.department}
            disabled={saved}
            onChange={(department) => updateHome("home2", { department })}
          />
          <TextRow
            label="Email"
            type="email"
            value={form.home2.email}
            disabled={saved}
            onChange={(email) => updateHome("home2", { email })}
          />
          <TextRow
            label="Phone (WhatsApp preferable)"
            value={form.home2.phone}
            disabled={saved}
            onChange={(phone) => updateHome("home2", { phone })}
          />
          <TextRow
            label="Assignment date"
            type="date"
            value={form.home2.assignmentDate}
            disabled={saved}
            onChange={(assignmentDate) =>
              updateHome("home2", { assignmentDate })
            }
          />
          <ChoiceRow label="Responsibilities acknowledged">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={form.home2.responsibilitiesAcknowledged}
                disabled={saved}
                onChange={(event) =>
                  updateHome("home2", {
                    responsibilitiesAcknowledged: event.target.checked,
                  })
                }
                className="mt-1"
              />
              <span>{HOME_RESPONSIBILITIES}</span>
            </label>
          </ChoiceRow>
        </FormTable>

        <FormTable title="Host Academic Supervisor assignment (filled by the Host focal person)">
          <ReadRow label="Name" value="Pending" />
          <ReadRow label="Title/position" value="Pending" />
          <ReadRow label="Department" value="Pending" />
          <ReadRow label="Email" value="Pending" />
          <ReadRow label="Phone" value="Pending" />
          <ReadRow label="Assignment date" value="Pending" />
          <ReadRow
            label="Responsibilities acknowledged"
            value={HOST_RESPONSIBILITIES}
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
              role: "Host institution focal person for Target group 1",
              name: pending(letter?.focalPerson),
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Home institution focal person / coordinator for Target group 2",
              name: "Home institution focal person / coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting acknowledgement",
              date: form.signedAt || "Awaiting acknowledgement",
            },
            {
              role: "Coordinator",
              name: "Coordinator",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Home academic supervisor",
              name: form.home1.name.trim() || "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Host academic supervisor",
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
            Dual supervision form acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={acknowledge}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Acknowledged" : "Acknowledge dual supervision form"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date" | "email";
}) {
  return (
    <ChoiceRow label={label}>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
      />
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
