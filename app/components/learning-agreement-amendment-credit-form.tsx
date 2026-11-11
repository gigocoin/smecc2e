"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that all changes are justified and become effective only after the required institutional approvals.";

const NOTE_HOME =
  "The responsible person at the Home Institution is an academic who has the authority to approve the Learning Agreement, to exceptionally amend it when it is needed, as well as to guarantee full recognition of such programme on behalf of the responsible academic body.";

const NOTE_HOST =
  "The responsible person at the Host Institution is an academic who has the authority to approve the Learning Agreement, to exceptionally amend it when it is needed.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type YesNo = "" | "yes" | "no";
type PeriodChange = "no" | "yes";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type AmendmentComponent = {
  id: string;
  code: string;
  title: string;
  semester: string;
  added: YesNo;
  deleted: YesNo;
  reasons: string;
  credits: string;
};

type FormState = {
  cohort: Cohort;
  originalAgreementRef: string;
  originalApprovalDate: string;
  amendmentReason: string;
  tableA2: AmendmentComponent[];
  tableB2: AmendmentComponent[];
  periodChange: PeriodChange;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  justificationAttached: boolean;
  justificationFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function newComponent(): AmendmentComponent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: "",
    title: "",
    semester: "",
    added: "",
    deleted: "",
    reasons: "",
    credits: "",
  };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  originalAgreementRef: "",
  originalApprovalDate: "",
  amendmentReason: "",
  tableA2: [newComponent()],
  tableB2: [newComponent()],
  periodChange: "no",
  oldStartDate: "",
  oldEndDate: "",
  newStartDate: "",
  newEndDate: "",
  justificationAttached: false,
  justificationFileName: "",
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

function parseCredits(value: string): number {
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatCredits(total: number): string {
  return total > 0
    ? total.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "Pending";
}

function storageKey(applicationId: string): string {
  return `smecc2e.learning-agreement-amendment-credit.${applicationId}`;
}

export function LearningAgreementAmendmentCreditForm({
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
          tableA2: [newComponent()],
          tableB2: [newComponent()],
          originalAgreementRef: pending(app?.publicId || app?.id),
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        tableA2:
          parsed.tableA2 && parsed.tableA2.length > 0
            ? parsed.tableA2
            : [newComponent()],
        tableB2:
          parsed.tableB2 && parsed.tableB2.length > 0
            ? parsed.tableB2
            : [newComponent()],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        tableA2: [newComponent()],
        tableB2: [newComponent()],
      });
    }
  }, [applicationId, app?.id, app?.publicId]);

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
  const totalA2 = form.tableA2.reduce(
    (sum, component) => sum + parseCredits(component.credits),
    0
  );
  const totalB2 = form.tableB2.reduce(
    (sum, component) => sum + parseCredits(component.credits),
    0
  );

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

  const updateTable = (
    table: "tableA2" | "tableB2",
    id: string,
    patch: Partial<AmendmentComponent>
  ) => {
    update({
      [table]: form[table].map((component) =>
        component.id === id ? { ...component, ...patch } : component
      ),
    });
  };

  const addRow = (table: "tableA2" | "tableB2") => {
    update({ [table]: [...form[table], newComponent()] });
  };

  const removeRow = (table: "tableA2" | "tableB2", id: string) => {
    if (form[table].length <= 1) return;
    update({
      [table]: form[table].filter((component) => component.id !== id),
    });
  };

  const sign = () => {
    if (saved) return;
    if (!form.amendmentReason.trim()) {
      setError("Enter the reason the amendment is required.");
      return;
    }
    const hasA2Change = form.tableA2.some(
      (component) =>
        (component.title.trim() || component.code.trim()) &&
        (component.added === "yes" || component.deleted === "yes")
    );
    const hasB2Change = form.tableB2.some(
      (component) =>
        (component.title.trim() || component.code.trim()) &&
        (component.added === "yes" || component.deleted === "yes")
    );
    if (!hasA2Change && !hasB2Change && form.periodChange === "no") {
      setError(
        "Record at least one Table A2/B2 component change or a mobility period change."
      );
      return;
    }
    if (form.periodChange === "yes") {
      if (
        !form.oldStartDate ||
        !form.oldEndDate ||
        !form.newStartDate ||
        !form.newEndDate
      ) {
        setError("Enter both the old and new mobility period dates.");
        return;
      }
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
            Learning agreement / study programme amendment form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Student + Home/Host institutions
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Formally record and approve changes during mobility.
        </p>

        <FormTable title="Participant & mobility details">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="la-amend-credit-cohort"
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

        <FormTable title="Linked approved agreement">
          <TextRow
            label="Original Learning Agreement reference"
            value={form.originalAgreementRef}
            disabled={saved}
            onChange={(originalAgreementRef) =>
              update({ originalAgreementRef })
            }
          />
          <TextRow
            label="Date of original approval"
            type="date"
            value={form.originalApprovalDate}
            disabled={saved}
            onChange={(originalApprovalDate) =>
              update({ originalApprovalDate })
            }
          />
          <TextRow
            label="Reason amendment is required"
            value={form.amendmentReason}
            disabled={saved}
            multiline
            onChange={(amendmentReason) => update({ amendmentReason })}
          />
        </FormTable>

        <AmendmentTable
          title="Changes: Table A2 — Host study programme (filled and signed before mobility)"
          columns={{
            code: "Component/Course code at Host HEI",
            title: "Component title at the Host Institution (as indicated in the course catalogue)",
            semester: "Semester at Host HEI",
            credits: "Number of agreed credits",
          }}
          rows={form.tableA2}
          totalLabel="Total host credits"
          total={formatCredits(totalA2)}
          saved={saved}
          onChange={(id, patch) => updateTable("tableA2", id, patch)}
          onAdd={() => addRow("tableA2")}
          onRemove={(id) => removeRow("tableA2", id)}
        />

        <AmendmentTable
          title="Changes: Table B2 — Recognition at Home Institution (filled and signed before mobility)"
          columns={{
            code: "Component/Course code at Home HEI",
            title: "Component title at the Home Institution (as indicated in the course catalogue)",
            semester: "Semester at Home HEI",
            credits: "Number of credits to be recognised",
          }}
          rows={form.tableB2}
          totalLabel="Total home credits"
          total={formatCredits(totalB2)}
          saved={saved}
          onChange={(id, patch) => updateTable("tableB2", id, patch)}
          onAdd={() => addRow("tableB2")}
          onRemove={(id) => removeRow("tableB2", id)}
        />

        <FormTable title="Updated mobility dates">
          <ChoiceRow label="Change to study/mobility period">
            <RadioGroup
              name="la-amend-credit-period"
              value={form.periodChange}
              disabled={saved}
              onChange={(periodChange) =>
                update({
                  periodChange: periodChange as PeriodChange,
                  ...(periodChange === "no"
                    ? {
                        oldStartDate: "",
                        oldEndDate: "",
                        newStartDate: "",
                        newEndDate: "",
                      }
                    : {}),
                })
              }
              options={[
                ["no", "No"],
                ["yes", "Yes — old and new dates"],
              ]}
            />
          </ChoiceRow>
          {form.periodChange === "yes" && (
            <>
              <TextRow
                label="Old mobility start date"
                type="date"
                value={form.oldStartDate}
                disabled={saved}
                onChange={(oldStartDate) => update({ oldStartDate })}
              />
              <TextRow
                label="Old mobility end date"
                type="date"
                value={form.oldEndDate}
                disabled={saved}
                onChange={(oldEndDate) => update({ oldEndDate })}
              />
              <TextRow
                label="New mobility start date"
                type="date"
                value={form.newStartDate}
                disabled={saved}
                onChange={(newStartDate) => update({ newStartDate })}
              />
              <TextRow
                label="New mobility end date"
                type="date"
                value={form.newEndDate}
                disabled={saved}
                onChange={(newEndDate) => update({ newEndDate })}
              />
            </>
          )}
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Supporting academic justification where required"
              checked={form.justificationAttached}
              fileName={form.justificationFileName}
              disabled={saved}
              onCheckedChange={(justificationAttached) =>
                update({
                  justificationAttached,
                  justificationFileName: justificationAttached
                    ? form.justificationFileName
                    : "",
                })
              }
              onFileNameChange={(justificationFileName) =>
                update({ justificationAttached: true, justificationFileName })
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
          <div className="mt-4 space-y-2 px-1 text-sm leading-6 text-slate-600">
            <p>
              <span className="font-semibold text-[#062763]">Note. </span>
              {NOTE_HOME}
            </p>
            <p>{NOTE_HOST}</p>
          </div>
        </section>

        <SignTable
          title="Sign-off"
          rows={[
            {
              role: "Student",
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
              role: "Responsible person at Home Institution",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Responsible person at Host Institution",
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
            Learning agreement amendment signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign learning agreement amendment"}
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

function AmendmentTable({
  title,
  columns,
  rows,
  totalLabel,
  total,
  saved,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  columns: {
    code: string;
    title: string;
    semester: string;
    credits: string;
  };
  rows: AmendmentComponent[];
  totalLabel: string;
  total: string;
  saved: boolean;
  onChange: (id: string, patch: Partial<AmendmentComponent>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
          {title}
        </caption>
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <th className="border border-slate-300 px-2 py-2">{columns.code}</th>
            <th className="border border-slate-300 px-2 py-2">
              {columns.title}
            </th>
            <th className="border border-slate-300 px-2 py-2">
              {columns.semester}
            </th>
            <th className="border border-slate-300 px-2 py-2">
              Added component
            </th>
            <th className="border border-slate-300 px-2 py-2">
              Deleted component
            </th>
            <th className="border border-slate-300 px-2 py-2">Reasons</th>
            <th className="border border-slate-300 px-2 py-2">
              {columns.credits}
            </th>
            <th className="border border-slate-300 px-2 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((component) => (
            <tr key={component.id}>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={component.code}
                  disabled={saved}
                  onChange={(event) =>
                    onChange(component.id, { code: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={component.title}
                  disabled={saved}
                  onChange={(event) =>
                    onChange(component.id, { title: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={component.semester}
                  disabled={saved}
                  onChange={(event) =>
                    onChange(component.id, { semester: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <YesNoSelect
                  value={component.added}
                  disabled={saved}
                  onChange={(added) => onChange(component.id, { added })}
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <YesNoSelect
                  value={component.deleted}
                  disabled={saved}
                  onChange={(deleted) => onChange(component.id, { deleted })}
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={component.reasons}
                  disabled={saved}
                  onChange={(event) =>
                    onChange(component.id, { reasons: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={component.credits}
                  disabled={saved}
                  onChange={(event) =>
                    onChange(component.id, { credits: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                {!saved && rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove(component.id)}
                    className="text-sm font-semibold text-slate-600 hover:text-[#062763]"
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!saved && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
        >
          Add another component
        </button>
      )}
      <p className="mt-2 text-sm font-semibold text-[#062763]">
        {totalLabel}: {total}
      </p>
    </section>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
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

function YesNoSelect({
  value,
  disabled,
  onChange,
}: {
  value: YesNo;
  disabled: boolean;
  onChange: (value: YesNo) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as YesNo)}
      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
    >
      <option value="">—</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
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
