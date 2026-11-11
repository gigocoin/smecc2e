"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const TRIGGER_OPTIONS = [
  ["supervisor_report", "Supervisor report"],
  ["student_progress_report", "Student progress report"],
  ["transcript", "Transcript"],
  ["participant", "Participant"],
  ["other", "Other"],
] as const;

const SUPPORT_OPTIONS = [
  ["tutoring", "Tutoring"],
  ["mentoring", "Mentoring"],
  ["study_plan_adjustment", "Study-plan adjustment"],
  ["deadline_extension", "Deadline extension"],
  ["counselling", "Counselling"],
  ["other", "Other"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type TriggerKey = (typeof TRIGGER_OPTIONS)[number][0];
type SupportKey = (typeof SUPPORT_OPTIONS)[number][0];
type Severity = "" | "low" | "moderate" | "high" | "critical";
type Outcome = "" | "open" | "improved" | "escalated" | "closed";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type RiskRow = {
  id: string;
  issue: string;
  severity: Severity;
  immediateImpact: string;
};

type ActionRow = {
  id: string;
  action: string;
  responsiblePerson: string;
  dueDate: string;
};

type FormState = {
  cohort: Cohort;
  triggerSources: TriggerKey[];
  otherTrigger: string;
  risks: RiskRow[];
  actions: ActionRow[];
  supportRequired: SupportKey[];
  otherSupport: string;
  successIndicator: string;
  reviewDate: string;
  outcome: Outcome;
  evidenceAttached: boolean;
  evidenceFileName: string;
  signature: string;
  signedAt: string;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newRisk(): RiskRow {
  return { id: newId(), issue: "", severity: "", immediateImpact: "" };
}

function newAction(): ActionRow {
  return { id: newId(), action: "", responsiblePerson: "", dueDate: "" };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  triggerSources: [],
  otherTrigger: "",
  risks: [newRisk()],
  actions: [newAction()],
  supportRequired: [],
  otherSupport: "",
  successIndicator: "",
  reviewDate: "",
  outcome: "",
  evidenceAttached: false,
  evidenceFileName: "",
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
  return `smecc2e.academic-intervention-corrective.${applicationId}`;
}

export function AcademicInterventionCorrectiveForm({
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
          risks: [newRisk()],
          actions: [newAction()],
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        triggerSources: parsed.triggerSources ?? [],
        supportRequired: parsed.supportRequired ?? [],
        risks:
          parsed.risks && parsed.risks.length > 0 ? parsed.risks : [newRisk()],
        actions:
          parsed.actions && parsed.actions.length > 0
            ? parsed.actions
            : [newAction()],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        risks: [newRisk()],
        actions: [newAction()],
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

  const toggleTrigger = (value: TriggerKey) => {
    if (saved) return;
    const selected = form.triggerSources.includes(value);
    update({
      triggerSources: selected
        ? form.triggerSources.filter((item) => item !== value)
        : [...form.triggerSources, value],
      otherTrigger: value === "other" && selected ? "" : form.otherTrigger,
    });
  };

  const toggleSupport = (value: SupportKey) => {
    if (saved) return;
    const selected = form.supportRequired.includes(value);
    update({
      supportRequired: selected
        ? form.supportRequired.filter((item) => item !== value)
        : [...form.supportRequired, value],
      otherSupport: value === "other" && selected ? "" : form.otherSupport,
    });
  };

  const updateRisk = (id: string, patch: Partial<RiskRow>) => {
    update({
      risks: form.risks.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const updateAction = (id: string, patch: Partial<ActionRow>) => {
    update({
      actions: form.actions.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const sign = () => {
    if (saved) return;
    if (form.triggerSources.length === 0) {
      setError("Select at least one trigger source.");
      return;
    }
    if (
      form.triggerSources.includes("other") &&
      !form.otherTrigger.trim()
    ) {
      setError("Describe the other trigger source.");
      return;
    }
    if (!form.risks.some((row) => row.issue.trim())) {
      setError("Enter at least one identified issue.");
      return;
    }
    if (!form.actions.some((row) => row.action.trim())) {
      setError("Enter at least one corrective action.");
      return;
    }
    if (form.supportRequired.length === 0) {
      setError("Select at least one type of support required.");
      return;
    }
    if (
      form.supportRequired.includes("other") &&
      !form.otherSupport.trim()
    ) {
      setError("Describe the other support required.");
      return;
    }
    if (!form.successIndicator.trim()) {
      setError("Enter the success indicator.");
      return;
    }
    if (!form.reviewDate) {
      setError("Enter the review date.");
      return;
    }
    if (!form.outcome) {
      setError("Select the outcome status.");
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
            Academic intervention / corrective action plan form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Supervisor + Home mentor + Coordinator
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Record timely intervention when monitoring identifies academic or
          personal risk.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="intervention-cohort"
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
          <ChoiceRow label="Trigger source">
            <div className="flex flex-col gap-2">
              {TRIGGER_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.triggerSources.includes(value)}
                    disabled={saved}
                    onChange={() => toggleTrigger(value)}
                  />
                  {label}
                </label>
              ))}
              {form.triggerSources.includes("other") && (
                <input
                  type="text"
                  value={form.otherTrigger}
                  disabled={saved}
                  placeholder="Describe other trigger"
                  onChange={(event) =>
                    update({ otherTrigger: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Risk / early warning
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">
                  Issue(s) identified
                </th>
                <th className="border border-slate-300 px-2 py-2">Severity</th>
                <th className="border border-slate-300 px-2 py-2">
                  Immediate impact
                </th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.risks.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.issue}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateRisk(row.id, { issue: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <select
                      value={row.severity}
                      disabled={saved}
                      onChange={(event) =>
                        updateRisk(row.id, {
                          severity: event.target.value as Severity,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    >
                      <option value="">—</option>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.immediateImpact}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateRisk(row.id, {
                          immediateImpact: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.risks.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            risks: form.risks.filter(
                              (item) => item.id !== row.id
                            ),
                          })
                        }
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
              onClick={() => update({ risks: [...form.risks, newRisk()] })}
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another issue
            </button>
          )}
        </section>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Corrective action plan
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">Action</th>
                <th className="border border-slate-300 px-2 py-2">
                  Responsible person
                </th>
                <th className="border border-slate-300 px-2 py-2">Due date</th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.actions.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.action}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateAction(row.id, { action: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.responsiblePerson}
                      disabled={saved}
                      onChange={(event) =>
                        updateAction(row.id, {
                          responsiblePerson: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="date"
                      value={row.dueDate}
                      disabled={saved}
                      onChange={(event) =>
                        updateAction(row.id, { dueDate: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.actions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            actions: form.actions.filter(
                              (item) => item.id !== row.id
                            ),
                          })
                        }
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
              onClick={() =>
                update({ actions: [...form.actions, newAction()] })
              }
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another action
            </button>
          )}
        </section>

        <FormTable title="Support, review and outcome">
          <ChoiceRow label="Support required (select as many as possible)">
            <div className="flex flex-col gap-2">
              {SUPPORT_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.supportRequired.includes(value)}
                    disabled={saved}
                    onChange={() => toggleSupport(value)}
                  />
                  {label}
                </label>
              ))}
              {form.supportRequired.includes("other") && (
                <input
                  type="text"
                  value={form.otherSupport}
                  disabled={saved}
                  placeholder="Describe other support"
                  onChange={(event) =>
                    update({ otherSupport: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="Success indicator"
            value={form.successIndicator}
            disabled={saved}
            multiline
            onChange={(successIndicator) => update({ successIndicator })}
          />
          <TextRow
            label="Review date"
            type="date"
            value={form.reviewDate}
            disabled={saved}
            onChange={(reviewDate) => update({ reviewDate })}
          />
          <ChoiceRow label="Outcome">
            <RadioGroup
              name="intervention-outcome"
              value={form.outcome}
              disabled={saved}
              onChange={(outcome) => update({ outcome: outcome as Outcome })}
              options={[
                ["open", "Open"],
                ["improved", "Improved"],
                ["escalated", "Escalated"],
                ["closed", "Closed"],
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
              label="Evidence where appropriate"
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

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Host Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Home Mentor/Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Received by"
          rows={[
            {
              role: "Host Focal Person",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewable"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting acknowledgement",
              date: form.signedAt || "Awaiting acknowledgement",
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
            Academic intervention / corrective action plan acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form acknowledged" : "Acknowledge corrective action plan"}
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
