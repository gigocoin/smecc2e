"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I certify that the payment was processed in accordance with the applicable award and financial conditions.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type YesNo = "" | "yes" | "no";
type YesNoNa = "" | "yes" | "no" | "na";
type PaymentType =
  | ""
  | "monthly-subsistence"
  | "travel"
  | "visa-residence"
  | "research-cost"
  | "other";
type PaymentStatus = "" | "pending" | "paid" | "failed" | "reprocessed";

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
  documentationComplete: YesNo;
  participationConfirmed: YesNo;
  progressReportSubmitted: YesNoNa;
  performanceSatisfactory: YesNoNa;
  fundsAvailable: YesNo;
  paymentType: PaymentType;
  periodCovered: string;
  approvedAmount: string;
  exchangeRate: string;
  bankCharges: string;
  netTransferred: string;
  transferDateReference: string;
  status: PaymentStatus;
  transferEvidenceAttached: boolean;
  transferEvidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  documentationComplete: "",
  participationConfirmed: "",
  progressReportSubmitted: "",
  performanceSatisfactory: "",
  fundsAvailable: "",
  paymentType: "",
  periodCovered: "",
  approvedAmount: "",
  exchangeRate: "",
  bankCharges: "",
  netTransferred: "",
  transferDateReference: "",
  status: "",
  transferEvidenceAttached: false,
  transferEvidenceFileName: "",
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
  return `smecc2e.installment-payment.${applicationId}`;
}

export function ScholarshipInstallmentPaymentForm({
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

  const save = () => {
    if (saved) return;
    if (!form.documentationComplete) {
      setError("Confirm whether required documentation is complete.");
      return;
    }
    if (!form.participationConfirmed) {
      setError("Confirm arrival/continued participation.");
      return;
    }
    if (!form.progressReportSubmitted) {
      setError("Confirm the required progress report status.");
      return;
    }
    if (!form.performanceSatisfactory) {
      setError("Confirm academic/professional performance status.");
      return;
    }
    if (!form.fundsAvailable) {
      setError("Confirm whether project funds are available/transferred.");
      return;
    }
    if (!form.paymentType) {
      setError("Choose a payment type.");
      return;
    }
    if (!form.periodCovered.trim()) {
      setError("Enter the period covered.");
      return;
    }
    if (!form.approvedAmount.trim()) {
      setError("Enter the approved amount.");
      return;
    }
    if (!form.status) {
      setError("Choose a payment status.");
      return;
    }
    if (!form.declared) {
      setError("Confirm the declaration before you save.");
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
        "The form was saved in this session, but it could not be stored in this browser."
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
            Scholarship instalment / payment record form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Host finance officer / coordinator finance officer
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Authorise and record scholarship instalments subject to applicable
          conditions.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="installment-cohort"
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

        <FormTable title="Eligibility checks">
          <ChoiceRow label="Required documentation complete">
            <RadioGroup
              name="docs-complete"
              value={form.documentationComplete}
              disabled={saved}
              onChange={(documentationComplete) =>
                update({ documentationComplete: documentationComplete as YesNo })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Arrival/continued participation confirmed">
            <RadioGroup
              name="participation-confirmed"
              value={form.participationConfirmed}
              disabled={saved}
              onChange={(participationConfirmed) =>
                update({
                  participationConfirmed: participationConfirmed as YesNo,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Required progress report submitted">
            <RadioGroup
              name="progress-report"
              value={form.progressReportSubmitted}
              disabled={saved}
              onChange={(progressReportSubmitted) =>
                update({
                  progressReportSubmitted: progressReportSubmitted as YesNoNa,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Academic/professional performance satisfactory">
            <RadioGroup
              name="performance"
              value={form.performanceSatisfactory}
              disabled={saved}
              onChange={(performanceSatisfactory) =>
                update({
                  performanceSatisfactory: performanceSatisfactory as YesNoNa,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Project funds available/transferred">
            <RadioGroup
              name="funds-available"
              value={form.fundsAvailable}
              disabled={saved}
              onChange={(fundsAvailable) =>
                update({ fundsAvailable: fundsAvailable as YesNo })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
        </FormTable>

        <FormTable title="Payment details">
          <ChoiceRow label="Payment type">
            <RadioGroup
              name="payment-type"
              value={form.paymentType}
              disabled={saved}
              onChange={(paymentType) =>
                update({ paymentType: paymentType as PaymentType })
              }
              options={[
                ["monthly-subsistence", "Monthly subsistence"],
                ["travel", "Travel"],
                ["visa-residence", "Visa/residence"],
                ["research-cost", "Research cost"],
                ["other", "Other eligible support"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Period covered"
            value={form.periodCovered}
            disabled={saved}
            placeholder="Dates/month"
            onChange={(periodCovered) => update({ periodCovered })}
          />
          <TextRow
            label="Approved amount"
            value={form.approvedAmount}
            disabled={saved}
            placeholder="Currency/amount"
            onChange={(approvedAmount) => update({ approvedAmount })}
          />
          <TextRow
            label="Exchange rate used if applicable"
            value={form.exchangeRate}
            disabled={saved}
            placeholder="Rate/source/date"
            onChange={(exchangeRate) => update({ exchangeRate })}
          />
          <TextRow
            label="Bank/intermediary charges"
            value={form.bankCharges}
            disabled={saved}
            placeholder="Amount if known"
            onChange={(bankCharges) => update({ bankCharges })}
          />
          <TextRow
            label="Net transferred"
            value={form.netTransferred}
            disabled={saved}
            placeholder="Currency/amount"
            onChange={(netTransferred) => update({ netTransferred })}
          />
          <TextRow
            label="Transfer date/reference"
            value={form.transferDateReference}
            disabled={saved}
            placeholder="Date/reference"
            onChange={(transferDateReference) =>
              update({ transferDateReference })
            }
          />
          <ChoiceRow label="Status">
            <RadioGroup
              name="payment-status"
              value={form.status}
              disabled={saved}
              onChange={(status) =>
                update({ status: status as PaymentStatus })
              }
              options={[
                ["pending", "Pending"],
                ["paid", "Paid"],
                ["failed", "Failed"],
                ["reprocessed", "Reprocessed"],
              ]}
            />
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Payment instruction/transfer evidence"
              checked={form.transferEvidenceAttached}
              fileName={form.transferEvidenceFileName}
              disabled={saved}
              onCheckedChange={(transferEvidenceAttached) =>
                update({
                  transferEvidenceAttached,
                  transferEvidenceFileName: transferEvidenceAttached
                    ? form.transferEvidenceFileName
                    : "",
                })
              }
              onFileNameChange={(transferEvidenceFileName) =>
                update({
                  transferEvidenceAttached: true,
                  transferEvidenceFileName,
                })
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
              role: "Host finance officer",
              name: "Host finance officer",
              signature: form.signedAt ? "Record saved" : "Pending",
              date: form.signedAt || "Pending",
            },
          ]}
        />
        <SignTable
          title="Received by"
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
          title="Viewed"
          rows={[
            {
              role: "Coordinator finance officer",
              name: "Coordinator finance officer",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Coordinator",
              name: "Coordinator",
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
            Instalment payment record saved
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Record saved" : "Save instalment record"}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <ChoiceRow label={label}>
      <input
        type="text"
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
