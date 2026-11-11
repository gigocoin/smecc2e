"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The student confirms that s/he has reported and commenced the approved mobility.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type YesNo = "" | "yes" | "no";
type WelcomeStatus = "" | "yes" | "no" | "scheduled";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  focalPerson: string;
};

type FormState = {
  cohort: Cohort;
  actualArrivalDate: string;
  actualReportingDate: string;
  hostRegistrationCompleted: YesNo;
  registrationNumber: string;
  hostUnit: string;
  accommodationConfirmed: YesNo;
  welcomeCompleted: WelcomeStatus;
  welcomeScheduledDate: string;
  supervisorName: string;
  supervisorEmail: string;
  homeMentorName: string;
  homeMentorEmail: string;
  actualMobilityStartDate: string;
  discrepancy: YesNo;
  discrepancyDetails: string;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  actualArrivalDate: "",
  actualReportingDate: "",
  hostRegistrationCompleted: "",
  registrationNumber: "",
  hostUnit: "",
  accommodationConfirmed: "",
  welcomeCompleted: "",
  welcomeScheduledDate: "",
  supervisorName: "",
  supervisorEmail: "",
  homeMentorName: "",
  homeMentorEmail: "",
  actualMobilityStartDate: "",
  discrepancy: "",
  discrepancyDetails: "",
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

function mobilityCategory(type: string): string {
  if (/staff/i.test(type)) return "Staff";
  if (/trainee/i.test(type)) return "Trainee";
  if (/phd/i.test(type)) return "PhD";
  if (/msc|master/i.test(type)) return "MSc";
  return pending(type);
}

function mobilityKind(type: string): string {
  if (/staff/i.test(type)) return "Staff";
  if (/trainee/i.test(type)) return "Traineeship";
  if (/credit/i.test(type)) return "Credit-Seeking";
  if (/degree/i.test(type)) return "Degree-Seeking";
  return pending(type);
}

function approvedDuration(startDate: string, endDate: string): string {
  const start = startDate.trim();
  const end = endDate.trim();
  if (!start && !end) return "Pending";
  if (start && end) return `${start} – ${end}`;
  return pending(start || end);
}

function storageKey(applicationId: string): string {
  return `smecc2e.arrival-confirmation.${applicationId}`;
}

export function ConfirmationOfArrivalForm({
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
  const isDegreeSeeking = /degree/i.test(mobilitySource);
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
    if (!form.actualArrivalDate.trim()) {
      setError("Enter the actual arrival date.");
      return;
    }
    if (!form.actualReportingDate.trim()) {
      setError("Enter the actual reporting date.");
      return;
    }
    if (!form.hostRegistrationCompleted) {
      setError("Choose whether host registration is completed.");
      return;
    }
    if (!form.accommodationConfirmed) {
      setError("Choose whether accommodation is confirmed.");
      return;
    }
    if (!form.welcomeCompleted) {
      setError("Choose the welcome/orientation status.");
      return;
    }
    if (
      form.welcomeCompleted === "scheduled" &&
      !form.welcomeScheduledDate.trim()
    ) {
      setError("Enter the scheduled welcome/orientation date.");
      return;
    }
    if (!form.actualMobilityStartDate.trim()) {
      setError("Enter the actual mobility start date.");
      return;
    }
    if (!form.discrepancy) {
      setError("Indicate whether there is a discrepancy from approved dates.");
      return;
    }
    if (form.discrepancy === "yes" && !form.discrepancyDetails.trim()) {
      setError("Explain the discrepancy from approved dates.");
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
            Confirmation of arrival / host registration form
          </h1>
          <p className="mt-2 text-sm text-white/80">Primary user: Scholar</p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Record actual arrival, registration and commencement of the approved
          mobility.
        </p>

        <FormTable title="Scholarship award record">
          <ChoiceRow label="Cohort">
            <RadioGroup
              name="arrival-cohort"
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
            label="Application / participant ID"
            value={pending(app?.publicId || app?.id)}
          />
          <ReadRow label="Full name" value={fullName} />
          <ReadRow
            label="Mobility category"
            value={mobilityCategory(mobilitySource)}
          />
          <ReadRow label="Mobility type" value={mobilityKind(mobilitySource)} />
          <ReadRow
            label="Home institution (not applicable for degree seeking)"
            value={
              isDegreeSeeking
                ? "N/A"
                : pending(homeInstitution === "—" ? "" : homeInstitution)
            }
          />
          <ReadRow
            label="Host institution / organization"
            value={pending(letter?.host || app?.preferredHostInstitution)}
          />
          <ReadRow
            label="Approved duration of mobility"
            value={approvedDuration(
              letter?.startDate ?? "",
              letter?.endDate ?? ""
            )}
          />
          <ReadRow
            label="Approved mobility period — start date"
            value={pending(letter?.startDate)}
          />
          <ReadRow
            label="Approved mobility period — end date"
            value={pending(letter?.endDate)}
          />
        </FormTable>

        <FormTable title="Arrival details">
          <TextRow
            label="Actual arrival date (i.e. date commenced mobility at host institution)"
            type="date"
            value={form.actualArrivalDate}
            disabled={saved}
            onChange={(actualArrivalDate) => update({ actualArrivalDate })}
          />
          <TextRow
            label="Actual reporting date"
            type="date"
            value={form.actualReportingDate}
            disabled={saved}
            onChange={(actualReportingDate) => update({ actualReportingDate })}
          />
          <ChoiceRow label="Host registration completed">
            <RadioGroup
              name="host-registration"
              value={form.hostRegistrationCompleted}
              disabled={saved}
              onChange={(hostRegistrationCompleted) =>
                update({
                  hostRegistrationCompleted:
                    hostRegistrationCompleted as YesNo,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Registration/student/staff number"
            value={form.registrationNumber}
            disabled={saved}
            onChange={(registrationNumber) => update({ registrationNumber })}
          />
          <TextRow
            label="Host unit/department"
            value={form.hostUnit}
            disabled={saved}
            onChange={(hostUnit) => update({ hostUnit })}
          />
          <ChoiceRow label="Accommodation confirmed">
            <RadioGroup
              name="accommodation-confirmed"
              value={form.accommodationConfirmed}
              disabled={saved}
              onChange={(accommodationConfirmed) =>
                update({
                  accommodationConfirmed: accommodationConfirmed as YesNo,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Welcome/orientation completed">
            <div className="space-y-2">
              <RadioGroup
                name="welcome-completed"
                value={form.welcomeCompleted}
                disabled={saved}
                onChange={(welcomeCompleted) =>
                  update({
                    welcomeCompleted: welcomeCompleted as WelcomeStatus,
                    welcomeScheduledDate:
                      welcomeCompleted === "scheduled"
                        ? form.welcomeScheduledDate
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["scheduled", "Scheduled date"],
                ]}
              />
              {form.welcomeCompleted === "scheduled" && (
                <input
                  type="date"
                  value={form.welcomeScheduledDate}
                  disabled={saved}
                  onChange={(event) =>
                    update({ welcomeScheduledDate: event.target.value })
                  }
                  className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="Academic supervisor assigned (name)"
            value={form.supervisorName}
            disabled={saved}
            placeholder="Name/contact"
            onChange={(supervisorName) => update({ supervisorName })}
          />
          <TextRow
            label="Academic supervisor assigned (email)"
            type="email"
            value={form.supervisorEmail}
            disabled={saved}
            onChange={(supervisorEmail) => update({ supervisorEmail })}
          />
          <TextRow
            label="Home academic mentor confirmed"
            value={form.homeMentorName}
            disabled={saved}
            placeholder="Name/contact"
            onChange={(homeMentorName) => update({ homeMentorName })}
          />
          <TextRow
            label="Home academic mentor confirmed (email)"
            type="email"
            value={form.homeMentorEmail}
            disabled={saved}
            onChange={(homeMentorEmail) => update({ homeMentorEmail })}
          />
          <TextRow
            label="Actual mobility start date"
            type="date"
            value={form.actualMobilityStartDate}
            disabled={saved}
            onChange={(actualMobilityStartDate) =>
              update({ actualMobilityStartDate })
            }
          />
          <ChoiceRow label="Discrepancy from approved dates">
            <div className="space-y-2">
              <RadioGroup
                name="arrival-discrepancy"
                value={form.discrepancy}
                disabled={saved}
                onChange={(discrepancy) =>
                  update({
                    discrepancy: discrepancy as YesNo,
                    discrepancyDetails:
                      discrepancy === "yes" ? form.discrepancyDetails : "",
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
                  disabled={saved}
                  rows={3}
                  placeholder="Explain"
                  onChange={(event) =>
                    update({ discrepancyDetails: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments (upload)
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Arrival/registration evidence where required (admission letter, etc.)"
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
          title="Scholar sign-off"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Focal person declaration & sign-off
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            The host institution confirms that the participant has reported and
            commenced the approved mobility.
          </p>
        </section>
        <SignTable
          title="Host sign-off"
          rows={[
            {
              role: "Host focal person",
              name: pending(letter?.focalPerson),
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "Coordinator",
              name: "Coordinator",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Quality assurance officer",
              name: "Quality assurance officer",
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
            Arrival form signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign arrival form"}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date" | "email";
  placeholder?: string;
}) {
  return (
    <ChoiceRow label={label}>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
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
