"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const CATEGORY_OPTIONS = [
  ["academic", "Academic"],
  ["finance", "Finance"],
  ["supervision", "Supervision"],
  ["discrimination", "Discrimination"],
  ["safeguarding", "Safeguarding"],
  ["administrative", "Administrative"],
  ["other", "Other"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type Category = (typeof CATEGORY_OPTIONS)[number][0] | "";
type YesNo = "" | "yes" | "no";

type LetterFields = {
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type ComplaintDraft = {
  complaintReference: string;
  category: Category;
  otherCategory: string;
  incidentDate: string;
  detailedComplaint: string;
  personsUnitsInvolved: string;
  stepsAlreadyTaken: string;
  desiredResolution: string;
  confidentialityFlag: YesNo;
  evidenceAttached: boolean;
  evidenceFileName: string;
  signature: string;
  signedAt: string;
};

type FormState = {
  cohort: Cohort;
  cases: ComplaintDraft[];
  draft: ComplaintDraft;
};

function padNo(n: number): string {
  return String(n).padStart(3, "0");
}

function buildComplaintReference(scholarId: string, sequence: number): string {
  const id = scholarId.trim().replace(/\s+/g, "") || "SCHOLAR";
  return `${id} – COM - ${padNo(sequence)}`;
}

function emptyDraft(complaintReference: string): ComplaintDraft {
  return {
    complaintReference,
    category: "",
    otherCategory: "",
    incidentDate: "",
    detailedComplaint: "",
    personsUnitsInvolved: "",
    stepsAlreadyTaken: "",
    desiredResolution: "",
    confidentialityFlag: "",
    evidenceAttached: false,
    evidenceFileName: "",
    signature: "",
    signedAt: "",
  };
}

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

function categoryLabel(value: Category): string {
  return CATEGORY_OPTIONS.find(([id]) => id === value)?.[1] ?? "—";
}

function storageKey(applicationId: string): string {
  return `smecc2e.complaint-grievance-management.${applicationId}`;
}

export function ComplaintGrievanceManagementForm({
  user,
  displayName,
}: {
  user: ApplicantSessionUser;
  displayName: string;
}) {
  const app = user.application;
  const applicationId = app?.id ?? user.email;
  const scholarId = app?.publicId || app?.id || "SCHOLAR";
  const [letter, setLetter] = useState<LetterFields | null>(null);
  const [form, setForm] = useState<FormState>({
    cohort: "cohort-1",
    cases: [],
    draft: emptyDraft(buildComplaintReference(scholarId, 1)),
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm({
          cohort: "cohort-1",
          cases: [],
          draft: emptyDraft(buildComplaintReference(scholarId, 1)),
        });
        setSaved(false);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      const cases = Array.isArray(parsed.cases) ? parsed.cases : [];
      const draft =
        parsed.draft && typeof parsed.draft === "object"
          ? {
              ...emptyDraft(
                buildComplaintReference(scholarId, cases.length + 1)
              ),
              ...parsed.draft,
              complaintReference:
                parsed.draft.complaintReference ||
                buildComplaintReference(scholarId, cases.length + 1),
            }
          : emptyDraft(buildComplaintReference(scholarId, cases.length + 1));
      setForm({
        cohort: parsed.cohort ?? "cohort-1",
        cases,
        draft,
      });
      setSaved(Boolean(parsed.draft?.signedAt));
    } catch {
      setForm({
        cohort: "cohort-1",
        cases: [],
        draft: emptyDraft(buildComplaintReference(scholarId, 1)),
      });
      setSaved(false);
    }
  }, [applicationId, scholarId]);

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
  const activeReference =
    form.draft.complaintReference ||
    buildComplaintReference(scholarId, form.cases.length + 1);

  const persist = (next: FormState) => {
    try {
      localStorage.setItem(storageKey(applicationId), JSON.stringify(next));
    } catch {
      setError(
        "The form was updated in this session, but it could not be stored in this browser."
      );
    }
  };

  const updateDraft = (patch: Partial<ComplaintDraft>) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      draft: {
        ...current.draft,
        ...patch,
        signature: "",
        signedAt: "",
      },
    }));
  };

  const updateCohort = (cohort: Cohort) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({ ...current, cohort }));
  };

  const sign = () => {
    if (saved) return;
    if (!form.draft.category) {
      setError("Select the complaint category.");
      return;
    }
    if (form.draft.category === "other" && !form.draft.otherCategory.trim()) {
      setError("Describe the other complaint category.");
      return;
    }
    if (!form.draft.incidentDate) {
      setError("Enter the incident / issue date.");
      return;
    }
    if (!form.draft.detailedComplaint.trim()) {
      setError("Enter the detailed complaint.");
      return;
    }
    if (!form.draft.personsUnitsInvolved.trim()) {
      setError("Enter the persons / units involved.");
      return;
    }
    if (!form.draft.stepsAlreadyTaken.trim()) {
      setError("Enter the steps already taken.");
      return;
    }
    if (!form.draft.desiredResolution.trim()) {
      setError("Enter the desired resolution.");
      return;
    }
    if (!form.draft.confidentialityFlag) {
      setError("Select the confidentiality / safeguarding flag.");
      return;
    }
    const signedAt = new Date().toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const signedDraft: ComplaintDraft = {
      ...form.draft,
      complaintReference: buildComplaintReference(
        scholarId,
        form.cases.length + 1
      ),
      signature: fullName,
      signedAt,
    };
    const next: FormState = {
      ...form,
      draft: signedDraft,
      cases: [...form.cases, signedDraft],
    };
    setForm(next);
    setSaved(true);
    setError(null);
    persist(next);
  };

  const startNextComplaint = () => {
    const nextDraft = emptyDraft(
      buildComplaintReference(scholarId, form.cases.length + 1)
    );
    const next: FormState = {
      ...form,
      draft: nextDraft,
    };
    setForm(next);
    setSaved(false);
    setError(null);
    persist(next);
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
            Complaint / grievance management
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Section A: Complaint / grievance submission form | Primary user:
            Scholar
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Submit a formal academic, administrative, financial, welfare or other
          complaint. Acknowledge receipt and assign case reference.
        </p>

        {form.cases.length > 0 && (
          <section className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
                Submitted complaints
              </caption>
              <thead>
                <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="border border-slate-300 px-3 py-2">
                    Reference
                  </th>
                  <th className="border border-slate-300 px-3 py-2">
                    Category
                  </th>
                  <th className="border border-slate-300 px-3 py-2">
                    Incident date
                  </th>
                  <th className="border border-slate-300 px-3 py-2">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.cases.map((item) => (
                  <tr key={item.complaintReference}>
                    <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
                      {item.complaintReference}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {item.category === "other"
                        ? item.otherCategory || "Other"
                        : categoryLabel(item.category)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {item.incidentDate || "—"}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {item.signedAt || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <FormTable title="Section A — Participant / case details">
          <ReadRow
            label="Complaint reference number"
            value={activeReference}
          />
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="complaint-cohort"
              value={form.cohort}
              disabled={saved}
              onChange={(cohort) => updateCohort(cohort as Cohort)}
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
          <ChoiceRow label="Complaint category">
            <RadioGroup
              name="complaint-category"
              value={form.draft.category}
              disabled={saved}
              onChange={(category) =>
                updateDraft({
                  category: category as Category,
                  otherCategory:
                    category === "other" ? form.draft.otherCategory : "",
                })
              }
              options={[...CATEGORY_OPTIONS]}
            />
          </ChoiceRow>
          {form.draft.category === "other" && (
            <TextRow
              label="Other category"
              value={form.draft.otherCategory}
              disabled={saved}
              onChange={(otherCategory) => updateDraft({ otherCategory })}
            />
          )}
          <TextRow
            label="Incident / issue date"
            type="date"
            value={form.draft.incidentDate}
            disabled={saved}
            onChange={(incidentDate) => updateDraft({ incidentDate })}
          />
          <TextRow
            label="Detailed complaint"
            value={form.draft.detailedComplaint}
            disabled={saved}
            multiline
            rows={5}
            onChange={(detailedComplaint) => updateDraft({ detailedComplaint })}
          />
          <TextRow
            label="Persons / units involved"
            value={form.draft.personsUnitsInvolved}
            disabled={saved}
            multiline
            rows={3}
            onChange={(personsUnitsInvolved) =>
              updateDraft({ personsUnitsInvolved })
            }
          />
          <TextRow
            label="Steps already taken"
            value={form.draft.stepsAlreadyTaken}
            disabled={saved}
            multiline
            rows={3}
            onChange={(stepsAlreadyTaken) =>
              updateDraft({ stepsAlreadyTaken })
            }
          />
          <TextRow
            label="Desired resolution"
            value={form.draft.desiredResolution}
            disabled={saved}
            multiline
            rows={3}
            onChange={(desiredResolution) =>
              updateDraft({ desiredResolution })
            }
          />
          <ChoiceRow label="Confidentiality / safeguarding flag">
            <RadioGroup
              name="complaint-confidentiality"
              value={form.draft.confidentialityFlag}
              disabled={saved}
              onChange={(confidentialityFlag) =>
                updateDraft({
                  confidentialityFlag: confidentialityFlag as YesNo,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ReadRow
            label="Submission date"
            value={form.draft.signedAt || "Autogenerated on submission"}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Supporting evidence where appropriate"
              checked={form.draft.evidenceAttached}
              fileName={form.draft.evidenceFileName}
              disabled={saved}
              onCheckedChange={(evidenceAttached) =>
                updateDraft({
                  evidenceAttached,
                  evidenceFileName: evidenceAttached
                    ? form.draft.evidenceFileName
                    : "",
                })
              }
              onFileNameChange={(evidenceFileName) =>
                updateDraft({ evidenceAttached: true, evidenceFileName })
              }
            />
          </div>
        </section>

        <SignTable
          title="Section A — Approval / sign-off"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.draft.signature || "Awaiting submission",
              date: form.draft.signedAt || "Autogenerated on submission",
            },
          ]}
        />

        <SignTable
          title="Received & acknowledged by"
          rows={[
            {
              role: "Host Focal person",
              name: "Pending",
              signature: "Pending",
              date: "Pending — recorded when first opened by the Host Focal person",
            },
          ]}
        />

        <ViewedTable
          title="Viewed by"
          rows={[
            {
              role: "SMECC2E Coordinator",
              name: "Pending",
              date: "Pending — recorded when first opened by the coordinator",
            },
            {
              role: "Quality Assurance officer",
              name: "Pending",
              date: "Pending — recorded when first opened by QA",
            },
          ]}
        />

        <PendingWorkflowSections complaintReference={activeReference} />

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
            Complaint submitted
            {form.draft.signedAt ? ` on ${form.draft.signedAt}` : ""}. Case
            reference {activeReference}.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={sign}
            disabled={saved}
            className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
          >
            {saved ? "Complaint submitted" : "Submit complaint / grievance"}
          </button>
          {saved && (
            <button
              type="button"
              onClick={startNextComplaint}
              className="inline-flex rounded-lg border border-[#062763] px-5 py-2.5 text-sm font-semibold text-[#062763] transition hover:bg-slate-50"
            >
              Start next complaint
            </button>
          )}
        </div>
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

function PendingWorkflowSections({
  complaintReference,
}: {
  complaintReference: string;
}) {
  const sections: {
    code: string;
    title: string;
    primaryUser: string;
    purpose: string;
    fields: string[];
  }[] = [
    {
      code: "B",
      title: "Level 1 complaint review form",
      primaryUser: "Host Focal Person",
      purpose: "Document host-level investigation and findings",
      fields: [
        "Issues reviewed",
        "Evidence / persons consulted",
        "Findings",
        "Proposed remedy",
        "Need more information (Yes / No — opens Section C)",
      ],
    },
    {
      code: "C",
      title: "Complaint additional information request form (optional)",
      primaryUser: "Host Focal Person + Scholar",
      purpose: "Request additional evidence or clarification",
      fields: [
        "Information required / deadline / reason (Host)",
        "Information supplied (Scholar)",
      ],
    },
    {
      code: "D",
      title: "Level 1 complaint decision form",
      primaryUser: "Host Focal Person",
      purpose: "Issue the host-level reasoned decision",
      fields: [
        "Decision (Upheld / Partly upheld / Not upheld)",
        "Reasons",
        "Corrective action / remedy",
        "Implementation deadline",
        "Right / route of escalation",
        "Scholar next action: Accept decision / Appeal to Level 2",
      ],
    },
    {
      code: "E",
      title: "Level 2 complaint appeal / escalation form",
      primaryUser: "Scholar",
      purpose: "Appeal or escalate a Level 1 decision",
      fields: [
        "Level 1 decision date",
        "Grounds for appeal",
        "New evidence",
        "Requested outcome",
      ],
    },
    {
      code: "F",
      title: "Level 2 review and decision form",
      primaryUser: "SMECC2E Coordinating Committee",
      purpose: "Record coordinating-institution review",
      fields: [
        "Materials reviewed",
        "Findings",
        "Decision",
        "Corrective action",
        "Implementation timeframe",
      ],
    },
    {
      code: "G",
      title: "Complaint corrective action tracking form",
      primaryUser: "Host Focal Person",
      purpose: "Track agreed remedial action to completion",
      fields: [
        "Action / responsible person / due date (repeatable)",
        "Status (Open / Complete / Overdue)",
        "Evidence of completion",
      ],
    },
    {
      code: "H",
      title: "Complaint closure form",
      primaryUser: "SMECC2E Coordinator + Host focal person + Scholar",
      purpose: "Record implementation and closure",
      fields: [
        "Actions completed",
        "Closure date",
        "Complainant notified (Yes / No)",
        "Residual issue (None / Details)",
      ],
    },
    {
      code: "I",
      title: "EU-level escalation record form",
      primaryUser: "Scholar",
      purpose: "Maintain an auditable record of any further formal escalation",
      fields: [
        "External body / channel",
        "Date escalated",
        "Documents transmitted",
        "Status / outcome",
      ],
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
        Institutional workflow (Sections B–I)
      </h2>
      <p className="px-1 text-sm leading-6 text-slate-700">
        These stages open for the case reference above after submission. Host,
        coordinator, and QA actions remain Pending until opened by the
        authorised role.
      </p>
      {sections.map((section) => (
        <div
          key={section.code}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
        >
          <p className="text-sm font-bold text-[#062763]">
            Section {section.code}: {section.title}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Primary user: {section.primaryUser}
          </p>
          <p className="mt-2 text-sm text-slate-700">{section.purpose}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="font-semibold text-[#062763]">
                Complaint reference:
              </dt>
              <dd>{complaintReference}</dd>
            </div>
            {section.fields.map((field) => (
              <div key={field} className="flex gap-2">
                <dt className="font-semibold text-[#062763]">{field}:</dt>
                <dd>Pending</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
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

function ViewedTable({
  title,
  rows,
}: {
  title: string;
  rows: { role: string; name: string; date: string }[];
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
              <td className="border border-slate-300 px-3 py-2">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
