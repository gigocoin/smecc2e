"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I certify that the insurance documentation has been checked against the SMECC2E minimum insurance requirements.";

const COVERAGE_100_ITEMS = [
  ["outpatient", "Outpatient medical expenses"],
  ["hospitalMedical", "Hospital/medical expenses"],
  ["doctorFees", "Doctor fees"],
  ["medicines", "Medicines/examinations/analyses prescribed by physician"],
  ["urgentDental", "Urgent dental care following accident"],
  ["surgical", "Hospital expenses and surgical fees incl. advances"],
] as const;

const INCLUDED_ITEMS = [
  ["pregnancy", "Pregnancy and childbirth"],
  ["repatriation", "Repatriation for serious illness/accident"],
  ["mortalRemains", "Death - transport of mortal remains"],
  ["funeral", "Death - funeral/laying-out costs"],
  ["coffin", "Death - coffin cost"],
  ["disability", "Permanent partial/full disability from accident"],
  ["mentalDisorders", "Non-permanent/non-chronic mental disorders"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type Coverage100 = "" | "100" | "confirmed" | "not-included";
type IncludedStatus = "" | "included" | "not-included";
type YesNa = "" | "yes" | "na";
type YesOnly = "" | "yes";
type Coverage100Id = (typeof COVERAGE_100_ITEMS)[number][0];
type IncludedId = (typeof INCLUDED_ITEMS)[number][0];

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
  insurer: string;
  policyNumber: string;
  certificateNumber: string;
  coverageStartDate: string;
  coverageEndDate: string;
  countriesCovered: string;
  emergencyContact: string;
  coverage100: Record<Coverage100Id, Coverage100>;
  included: Record<IncludedId, IncludedStatus>;
  preExistingDisclosed: YesNa;
  localLegalSatisfied: YesOnly;
  certificateAttached: boolean;
  certificateFileName: string;
  scheduleAttached: boolean;
  scheduleFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function emptyCoverage100(): Record<Coverage100Id, Coverage100> {
  return Object.fromEntries(
    COVERAGE_100_ITEMS.map(([id]) => [id, ""])
  ) as Record<Coverage100Id, Coverage100>;
}

function emptyIncluded(): Record<IncludedId, IncludedStatus> {
  return Object.fromEntries(
    INCLUDED_ITEMS.map(([id]) => [id, ""])
  ) as Record<IncludedId, IncludedStatus>;
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  insurer: "",
  policyNumber: "",
  certificateNumber: "",
  coverageStartDate: "",
  coverageEndDate: "",
  countriesCovered: "",
  emergencyContact: "",
  coverage100: emptyCoverage100(),
  included: emptyIncluded(),
  preExistingDisclosed: "",
  localLegalSatisfied: "",
  certificateAttached: false,
  certificateFileName: "",
  scheduleAttached: false,
  scheduleFileName: "",
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
  return `smecc2e.insurance.${applicationId}`;
}

export function InsuranceRegistrationForm({
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
          coverage100: emptyCoverage100(),
          included: emptyIncluded(),
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        coverage100: { ...emptyCoverage100(), ...parsed.coverage100 },
        included: { ...emptyIncluded(), ...parsed.included },
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        coverage100: emptyCoverage100(),
        included: emptyIncluded(),
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

  const setCoverage100 = (id: Coverage100Id, value: Coverage100) => {
    update({ coverage100: { ...form.coverage100, [id]: value } });
  };

  const setIncluded = (id: IncludedId, value: IncludedStatus) => {
    update({ included: { ...form.included, [id]: value } });
  };

  const sign = () => {
    if (saved) return;
    if (!form.insurer.trim()) {
      setError("Enter the insurer.");
      return;
    }
    if (!form.policyNumber.trim()) {
      setError("Enter the policy number.");
      return;
    }
    if (!form.coverageStartDate.trim()) {
      setError("Enter the coverage start date.");
      return;
    }
    if (!form.coverageEndDate.trim()) {
      setError("Enter the coverage end date.");
      return;
    }
    const missing100 = COVERAGE_100_ITEMS.find(
      ([id]) => !form.coverage100[id]
    );
    if (missing100) {
      setError(`Choose a status for “${missing100[1]}”.`);
      return;
    }
    const missingIncluded = INCLUDED_ITEMS.find(([id]) => !form.included[id]);
    if (missingIncluded) {
      setError(`Choose a status for “${missingIncluded[1]}”.`);
      return;
    }
    if (!form.preExistingDisclosed) {
      setError(
        "Confirm whether pre-existing chronic conditions were disclosed where applicable."
      );
      return;
    }
    if (!form.localLegalSatisfied) {
      setError("Confirm that local legal insurance requirements are satisfied.");
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
            Insurance registration & compliance verification form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Verify that insurance meets the minimum SMECC2E/Intra-Africa
          requirements for the full mobility journey and required post-mobility
          period.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="insurance-cohort"
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

        <FormTable title="Policy details">
          <TextRow
            label="Insurer"
            value={form.insurer}
            disabled={saved}
            onChange={(insurer) => update({ insurer })}
          />
          <TextRow
            label="Policy number"
            value={form.policyNumber}
            disabled={saved}
            onChange={(policyNumber) => update({ policyNumber })}
          />
          <TextRow
            label="Certificate number"
            value={form.certificateNumber}
            disabled={saved}
            onChange={(certificateNumber) => update({ certificateNumber })}
          />
          <TextRow
            label="Coverage start date"
            type="date"
            value={form.coverageStartDate}
            disabled={saved}
            hint="Must be no later than journey start"
            onChange={(coverageStartDate) => update({ coverageStartDate })}
          />
          <TextRow
            label="Coverage end date"
            type="date"
            value={form.coverageEndDate}
            disabled={saved}
            hint="Must extend to at least one month after mobility end unless grantee status ends earlier"
            onChange={(coverageEndDate) => update({ coverageEndDate })}
          />
          <TextRow
            label="Countries/territory covered"
            value={form.countriesCovered}
            disabled={saved}
            hint="Must include required intra-Africa travel"
            onChange={(countriesCovered) => update({ countriesCovered })}
          />
          <TextRow
            label="Emergency assistance contact"
            value={form.emergencyContact}
            disabled={saved}
            placeholder="Phone/email"
            onChange={(emergencyContact) => update({ emergencyContact })}
          />
        </FormTable>

        <FormTable title="Minimum coverage checklist">
          {COVERAGE_100_ITEMS.map(([id, label]) => (
            <ChoiceRow key={id} label={label}>
              <RadioGroup
                name={`coverage100-${id}`}
                value={form.coverage100[id]}
                disabled={saved}
                onChange={(value) =>
                  setCoverage100(id, value as Coverage100)
                }
                options={[
                  ["100", "100%"],
                  ["confirmed", "Confirmed"],
                  ["not-included", "Not included"],
                ]}
              />
            </ChoiceRow>
          ))}
          {INCLUDED_ITEMS.map(([id, label]) => (
            <ChoiceRow key={id} label={label}>
              <RadioGroup
                name={`included-${id}`}
                value={form.included[id]}
                disabled={saved}
                onChange={(value) =>
                  setIncluded(id, value as IncludedStatus)
                }
                options={[
                  ["included", "Included"],
                  ["not-included", "Not included"],
                ]}
              />
            </ChoiceRow>
          ))}
          <ChoiceRow label="Pre-existing chronic conditions disclosed where applicable">
            <RadioGroup
              name="pre-existing"
              value={form.preExistingDisclosed}
              disabled={saved}
              onChange={(preExistingDisclosed) =>
                update({ preExistingDisclosed: preExistingDisclosed as YesNa })
              }
              options={[
                ["yes", "Yes"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Local legal insurance requirements satisfied">
            <RadioGroup
              name="local-legal"
              value={form.localLegalSatisfied}
              disabled={saved}
              onChange={(localLegalSatisfied) =>
                update({ localLegalSatisfied: localLegalSatisfied as YesOnly })
              }
              options={[["yes", "Yes"]]}
            />
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Insurance certificate"
              checked={form.certificateAttached}
              fileName={form.certificateFileName}
              disabled={saved}
              onCheckedChange={(certificateAttached) =>
                update({
                  certificateAttached,
                  certificateFileName: certificateAttached
                    ? form.certificateFileName
                    : "",
                })
              }
              onFileNameChange={(certificateFileName) =>
                update({ certificateAttached: true, certificateFileName })
              }
            />
            <AttachmentRow
              label="Policy schedule/wording or insurer confirmation"
              checked={form.scheduleAttached}
              fileName={form.scheduleFileName}
              disabled={saved}
              onCheckedChange={(scheduleAttached) =>
                update({
                  scheduleAttached,
                  scheduleFileName: scheduleAttached
                    ? form.scheduleFileName
                    : "",
                })
              }
              onFileNameChange={(scheduleFileName) =>
                update({ scheduleAttached: true, scheduleFileName })
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
              name: pending(letter?.focalPerson),
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewable by"
          rows={[
            {
              role: "Project coordinator",
              name: "Project coordinator",
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
            Insurance form signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign insurance form"}
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
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
  hint?: string;
  placeholder?: string;
}) {
  return (
    <ChoiceRow label={label}>
      <div className="space-y-1">
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
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
