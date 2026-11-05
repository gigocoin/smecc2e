"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";
import { formatNomineeSubsistenceAllowance } from "@/lib/nominee-letter-shared";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "By signing electronically, each signatory confirms authority and acceptance of the approved Scholarship Agreement.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  entitlement: string;
  versionDate: string;
};

type FormState = {
  cohort: Cohort;
  agreementVersion: string;
  effectiveDate: string;
  termsRead: boolean;
  financialAcknowledged: boolean;
  reportingAcknowledged: boolean;
  insuranceAcknowledged: boolean;
  grievanceAcknowledged: boolean;
  externalPdf: boolean;
  externalPdfName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  agreementVersion: "",
  effectiveDate: "",
  termsRead: false,
  financialAcknowledged: false,
  reportingAcknowledged: false,
  insuranceAcknowledged: false,
  grievanceAcknowledged: false,
  externalPdf: false,
  externalPdfName: "",
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

function entitlementFromMobility(type: string): string {
  if (/staff/i.test(type)) return "EUR 2,370 /month";
  if (/trainee/i.test(type)) return "EUR 1,230 /month";
  if (/phd/i.test(type) && /credit/i.test(type)) return "EUR 1,230 /month";
  if (/phd/i.test(type)) return "EUR 1,230 /month";
  if (/credit/i.test(type)) return "EUR 890 /month";
  if (/msc|master|degree/i.test(type)) return "EUR 890 /month";
  return "";
}

function storageKey(applicationId: string): string {
  return `smecc2e.agreement.${applicationId}`;
}

export function ScholarshipAgreementForm({
  user,
  displayName,
  onViewAgreement,
}: {
  user: ApplicantSessionUser;
  displayName: string;
  onViewAgreement?: () => void;
}) {
  const app = user.application;
  const applicationId = app?.id ?? user.email;
  const [letter, setLetter] = useState<LetterFields | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/scholarship-agreement");
        if (res.ok) {
          const data = (await res.json()) as {
            form?: Partial<FormState> | null;
            submitted?: boolean;
          };
          if (!cancelled && data.form) {
            setForm({ ...EMPTY_FORM, ...data.form });
            if (data.submitted || data.form.signedAt) setSaved(true);
            return;
          }
        }
      } catch {
        // Fall back to any local draft below.
      }
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(storageKey(applicationId));
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<FormState>;
        setForm({ ...EMPTY_FORM, ...parsed });
        if (parsed.signedAt) setSaved(true);
      } catch {
        setForm(EMPTY_FORM);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/nominee-letter");
        if (!res.ok) return;
        const data = (await res.json()) as {
          letter?: {
            auto?: { nationality?: string; letterDate?: string };
            editable?: {
              hostUniversity?: string;
              mobilityType?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
              subsistenceAllowance?: string;
              durationMonths?: string;
            };
          };
        };
        if (cancelled || !data.letter) return;
        const editable = data.letter.editable;
        const formatted = formatNomineeSubsistenceAllowance(
          editable?.subsistenceAllowance ?? "",
          editable?.durationMonths ?? ""
        );
        setLetter({
          host: editable?.hostUniversity ?? "",
          mobilityType: editable?.mobilityType ?? "",
          startDate: editable?.mobilityStartDate ?? "",
          endDate: editable?.mobilityEndDate ?? "",
          nationality: data.letter.auto?.nationality ?? "",
          entitlement: formatted || entitlementFromMobility(editable?.mobilityType ?? ""),
          versionDate: data.letter.auto?.letterDate ?? "",
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
    if (saved || submitting) return;
    setError(null);
    setForm((current) => ({ ...current, ...patch, signature: "", signedAt: "" }));
  };

  const sign = () => {
    if (saved || submitting) return;
    if (!form.agreementVersion.trim()) {
      setError("Enter the scholarship agreement version and date.");
      return;
    }
    if (!form.effectiveDate) {
      setError("Enter the agreement effective date.");
      return;
    }
    if (
      !form.termsRead ||
      !form.financialAcknowledged ||
      !form.reportingAcknowledged ||
      !form.insuranceAcknowledged ||
      !form.grievanceAcknowledged
    ) {
      setError("Confirm every acknowledgement before you sign.");
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
    setSubmitting(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/applicant/scholarship-agreement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: next }),
        });
        const data = (await res.json()) as {
          form?: FormState;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Could not submit the agreement.");
          return;
        }
        const submitted = data.form ? { ...EMPTY_FORM, ...data.form } : next;
        setForm(submitted);
        setSaved(true);
        try {
          localStorage.setItem(storageKey(applicationId), JSON.stringify(submitted));
        } catch {
          // Server save succeeded; local draft is optional.
        }
      } catch {
        setError("Could not submit the agreement.");
      } finally {
        setSubmitting(false);
      }
    })();
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
            Scholarship agreement / e-signature form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Execute and archive the individual SMECC2E Scholarship Agreement.
        </p>

        {onViewAgreement && (
          <button
            type="button"
            onClick={onViewAgreement}
            className="inline-flex rounded-lg border border-[#062763] px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763] hover:text-white"
          >
            View scholarship agreement
          </button>
        )}

        <FormTable title="Agreement record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="agreement-cohort"
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
          <ChoiceRow label="Scholarship agreement version">
            <input
              type="text"
              value={form.agreementVersion}
              onChange={(event) => update({ agreementVersion: event.target.value })}
              placeholder={
                letter?.versionDate && letter.versionDate !== "[pending]"
                  ? `Version/date, e.g. ${letter.versionDate}`
                  : "Version/date"
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
            />
          </ChoiceRow>
          <ReadRow
            label="Monthly financial entitlement as agreed in your scholarship agreement"
            value={pending(letter?.entitlement || entitlementFromMobility(mobilitySource))}
          />
          <ChoiceRow label="Agreement effective date">
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(event) => update({ effectiveDate: event.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
            />
          </ChoiceRow>
        </FormTable>

        <FormTable title="Acknowledgements">
          <YesRow
            label="Terms read and understood"
            checked={form.termsRead}
            onChange={(termsRead) => update({ termsRead })}
          />
          <YesRow
            label="Financial conditions acknowledged"
            checked={form.financialAcknowledged}
            onChange={(financialAcknowledged) => update({ financialAcknowledged })}
          />
          <YesRow
            label="Reporting and academic obligations acknowledged"
            checked={form.reportingAcknowledged}
            onChange={(reportingAcknowledged) => update({ reportingAcknowledged })}
          />
          <YesRow
            label="Insurance and travel conditions acknowledged"
            checked={form.insuranceAcknowledged}
            onChange={(insuranceAcknowledged) => update({ insuranceAcknowledged })}
          />
          <YesRow
            label="Grievance / appeal process acknowledged"
            checked={form.grievanceAcknowledged}
            onChange={(grievanceAcknowledged) => update({ grievanceAcknowledged })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <label className="mt-3 flex items-start gap-3 px-1 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={form.externalPdf}
              onChange={(event) =>
                update({
                  externalPdf: event.target.checked,
                  externalPdfName: event.target.checked ? form.externalPdfName : "",
                })
              }
              className="mt-1"
            />
            <span>
              Final scholarship agreement PDF where an external signature is used
              {form.externalPdf && (
                <input
                  type="file"
                  accept="application/pdf"
                  className="mt-2 block w-full text-sm"
                  onChange={(event) =>
                    update({
                      externalPdfName: event.target.files?.[0]?.name ?? "",
                      externalPdf: true,
                    })
                  }
                />
              )}
              {form.externalPdfName && (
                <span className="mt-1 block font-semibold text-[#062763]">
                  {form.externalPdfName}
                </span>
              )}
            </span>
          </label>
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
        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "SMECC2E coordinator",
              name: "SMECC2E coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Approval / sign-off"
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
            Agreement signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved || submitting}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : saved ? "Agreement signed" : "Sign agreement"}
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

function YesRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <tr>
      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
          Yes
        </label>
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
            <tr key={`${title}-${row.role}-${row.name}`}>
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
