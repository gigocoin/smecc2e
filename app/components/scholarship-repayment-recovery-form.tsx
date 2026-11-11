"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type RecoveryReason =
  | ""
  | "paid-in-error"
  | "unauthorised-period"
  | "shortened-mobility"
  | "uncompleted-mobility"
  | "ineligibility"
  | "overlapping-funding"
  | "other";
type RecoveryMethod = "" | "repayment" | "offset" | "other";
type RecoveryStatus = "" | "open" | "part-paid" | "recovered" | "waived";

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
  reason: RecoveryReason;
  affectedPaymentPeriod: string;
  grossAmount: string;
  amountRecoverable: string;
  calculationBasis: string;
  decisionAuthority: string;
  recoveryMethod: RecoveryMethod;
  dueDate: string;
  recoveryStatus: RecoveryStatus;
  calculationSheetAttached: boolean;
  calculationSheetFileName: string;
  recoveryNoticeAttached: boolean;
  recoveryNoticeFileName: string;
  proofOfRepaymentAttached: boolean;
  proofOfRepaymentFileName: string;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  reason: "",
  affectedPaymentPeriod: "",
  grossAmount: "",
  amountRecoverable: "",
  calculationBasis: "",
  decisionAuthority: "",
  recoveryMethod: "",
  dueDate: "",
  recoveryStatus: "",
  calculationSheetAttached: false,
  calculationSheetFileName: "",
  recoveryNoticeAttached: false,
  recoveryNoticeFileName: "",
  proofOfRepaymentAttached: false,
  proofOfRepaymentFileName: "",
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
  return `smecc2e.repayment-recovery.${applicationId}`;
}

export function ScholarshipRepaymentRecoveryForm({
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

  const acknowledge = () => {
    if (saved) return;
    if (!form.reason) {
      setError("Choose a recovery reason.");
      return;
    }
    if (!form.affectedPaymentPeriod.trim()) {
      setError("Enter the affected payment period.");
      return;
    }
    if (!form.grossAmount.trim()) {
      setError("Enter the gross amount under review.");
      return;
    }
    if (!form.amountRecoverable.trim()) {
      setError("Enter the amount recoverable.");
      return;
    }
    if (!form.recoveryMethod) {
      setError("Choose a recovery method.");
      return;
    }
    if (!form.recoveryStatus) {
      setError("Choose a recovery status.");
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
            Scholarship repayment / recovery form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Host finance officer / coordinator finance officer
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Record recovery of ineligible, erroneous or excess scholarship
          payments.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="repayment-cohort"
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

        <FormTable title="Recovery assessment">
          <ChoiceRow label="Reason">
            <RadioGroup
              name="recovery-reason"
              value={form.reason}
              disabled={saved}
              onChange={(reason) =>
                update({ reason: reason as RecoveryReason })
              }
              options={[
                ["paid-in-error", "Paid in error"],
                ["unauthorised-period", "Unauthorised period"],
                ["shortened-mobility", "Shortened mobility"],
                ["uncompleted-mobility", "Uncompleted mobility"],
                ["ineligibility", "Ineligibility"],
                ["overlapping-funding", "Overlapping funding"],
                ["other", "Other"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Affected payment period"
            value={form.affectedPaymentPeriod}
            disabled={saved}
            placeholder="Dates"
            onChange={(affectedPaymentPeriod) =>
              update({ affectedPaymentPeriod })
            }
          />
          <TextRow
            label="Gross amount under review"
            value={form.grossAmount}
            disabled={saved}
            placeholder="Currency/amount"
            onChange={(grossAmount) => update({ grossAmount })}
          />
          <TextRow
            label="Amount recoverable"
            value={form.amountRecoverable}
            disabled={saved}
            placeholder="Currency/amount"
            onChange={(amountRecoverable) => update({ amountRecoverable })}
          />
          <TextRow
            label="Calculation basis"
            value={form.calculationBasis}
            disabled={saved}
            multiline
            onChange={(calculationBasis) => update({ calculationBasis })}
          />
          <TextRow
            label="Decision authority"
            value={form.decisionAuthority}
            disabled={saved}
            onChange={(decisionAuthority) => update({ decisionAuthority })}
          />
          <ChoiceRow label="Recovery method">
            <RadioGroup
              name="recovery-method"
              value={form.recoveryMethod}
              disabled={saved}
              onChange={(recoveryMethod) =>
                update({ recoveryMethod: recoveryMethod as RecoveryMethod })
              }
              options={[
                ["repayment", "Repayment"],
                ["offset", "Offset"],
                ["other", "Other"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Due date"
            type="date"
            value={form.dueDate}
            disabled={saved}
            onChange={(dueDate) => update({ dueDate })}
          />
          <ChoiceRow label="Recovery status">
            <RadioGroup
              name="recovery-status"
              value={form.recoveryStatus}
              disabled={saved}
              onChange={(recoveryStatus) =>
                update({ recoveryStatus: recoveryStatus as RecoveryStatus })
              }
              options={[
                ["open", "Open"],
                ["part-paid", "Part-paid"],
                ["recovered", "Recovered"],
                ["waived", "Waived with authority"],
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
              label="Calculation sheet"
              checked={form.calculationSheetAttached}
              fileName={form.calculationSheetFileName}
              disabled={saved}
              onCheckedChange={(calculationSheetAttached) =>
                update({
                  calculationSheetAttached,
                  calculationSheetFileName: calculationSheetAttached
                    ? form.calculationSheetFileName
                    : "",
                })
              }
              onFileNameChange={(calculationSheetFileName) =>
                update({
                  calculationSheetAttached: true,
                  calculationSheetFileName,
                })
              }
            />
            <AttachmentRow
              label="Recovery notice"
              checked={form.recoveryNoticeAttached}
              fileName={form.recoveryNoticeFileName}
              disabled={saved}
              onCheckedChange={(recoveryNoticeAttached) =>
                update({
                  recoveryNoticeAttached,
                  recoveryNoticeFileName: recoveryNoticeAttached
                    ? form.recoveryNoticeFileName
                    : "",
                })
              }
              onFileNameChange={(recoveryNoticeFileName) =>
                update({
                  recoveryNoticeAttached: true,
                  recoveryNoticeFileName,
                })
              }
            />
            <AttachmentRow
              label="Proof of repayment where applicable"
              checked={form.proofOfRepaymentAttached}
              fileName={form.proofOfRepaymentFileName}
              disabled={saved}
              onCheckedChange={(proofOfRepaymentAttached) =>
                update({
                  proofOfRepaymentAttached,
                  proofOfRepaymentFileName: proofOfRepaymentAttached
                    ? form.proofOfRepaymentFileName
                    : "",
                })
              }
              onFileNameChange={(proofOfRepaymentFileName) =>
                update({
                  proofOfRepaymentAttached: true,
                  proofOfRepaymentFileName,
                })
              }
            />
          </div>
        </section>

        <SignTable
          title="Sign"
          rows={[
            {
              role: "Host finance officer",
              name: "Host finance officer",
              signature: "Pending",
              date: "Pending",
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
          title="Received by"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting acknowledgement",
              date: form.signedAt || "Awaiting acknowledgement",
            },
            {
              role: "Project coordinator",
              name: "Project coordinator",
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
            Recovery form acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={acknowledge}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Acknowledged" : "Acknowledge receipt"}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <ChoiceRow label={label}>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          rows={3}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
      ) : (
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
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
