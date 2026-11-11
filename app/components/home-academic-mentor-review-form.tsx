"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type AlignmentStatus = "" | "yes" | "no" | "issues";
type YesNo = "" | "yes" | "no";
type ContactMethod = "" | "call" | "email";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type ContactRow = {
  id: string;
  date: string;
  method: ContactMethod;
  outcome: string;
};

type FormState = {
  cohort: Cohort;
  mentorName: string;
  planAlignment: AlignmentStatus;
  planAlignmentNotes: string;
  progressReviewed: YesNo;
  homeRequirementsAtRisk: YesNo;
  homeRequirementsExplain: string;
  creditRecognitionConcerns: YesNo;
  creditRecognitionDetails: string;
  contacts: ContactRow[];
  adviceSupport: string;
  reintegrationActions: string;
  signature: string;
  signedAt: string;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newContact(): ContactRow {
  return { id: newId(), date: "", method: "", outcome: "" };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  mentorName: "",
  planAlignment: "",
  planAlignmentNotes: "",
  progressReviewed: "",
  homeRequirementsAtRisk: "",
  homeRequirementsExplain: "",
  creditRecognitionConcerns: "",
  creditRecognitionDetails: "",
  contacts: [newContact()],
  adviceSupport: "",
  reintegrationActions: "",
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
  return `smecc2e.home-academic-mentor-review.${applicationId}`;
}

export function HomeAcademicMentorReviewForm({
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
        setForm({ ...EMPTY_FORM, contacts: [newContact()] });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        contacts:
          parsed.contacts && parsed.contacts.length > 0
            ? parsed.contacts
            : [newContact()],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({ ...EMPTY_FORM, contacts: [newContact()] });
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

  const updateContact = (id: string, patch: Partial<ContactRow>) => {
    update({
      contacts: form.contacts.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const sign = () => {
    if (saved) return;
    if (!form.mentorName.trim()) {
      setError("Enter the home academic mentor name.");
      return;
    }
    if (!form.planAlignment) {
      setError("Indicate whether learning/research plan alignment is maintained.");
      return;
    }
    if (!form.progressReviewed) {
      setError("Indicate whether progress information was reviewed.");
      return;
    }
    if (!form.homeRequirementsAtRisk) {
      setError("Indicate whether home programme requirements are at risk.");
      return;
    }
    if (
      form.homeRequirementsAtRisk === "yes" &&
      !form.homeRequirementsExplain.trim()
    ) {
      setError("Explain the home programme requirements at risk.");
      return;
    }
    if (!form.creditRecognitionConcerns) {
      setError("Indicate whether there are credit recognition concerns.");
      return;
    }
    if (
      form.creditRecognitionConcerns === "yes" &&
      !form.creditRecognitionDetails.trim()
    ) {
      setError("Provide details of the credit recognition concerns.");
      return;
    }
    const signedAt = new Date().toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const next = {
      ...form,
      signature: form.mentorName.trim(),
      signedAt,
    };
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
            Home academic supervisor/mentor review form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Home academic mentor/supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Document home-institution review, alignment and readiness for
          recognition/reintegration.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="home-mentor-cohort"
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

        <FormTable title="Mentor review">
          <TextRow
            label="Home academic mentor name"
            value={form.mentorName}
            disabled={saved}
            onChange={(mentorName) => update({ mentorName })}
          />
          <ChoiceRow label="Learning/research plan alignment maintained">
            <RadioGroup
              name="home-mentor-alignment"
              value={form.planAlignment}
              disabled={saved}
              onChange={(planAlignment) =>
                update({
                  planAlignment: planAlignment as AlignmentStatus,
                  planAlignmentNotes:
                    planAlignment === "issues"
                      ? form.planAlignmentNotes
                      : "",
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["issues", "Issues"],
              ]}
            />
          </ChoiceRow>
          {form.planAlignment === "issues" && (
            <TextRow
              label="Alignment issues"
              value={form.planAlignmentNotes}
              disabled={saved}
              multiline
              onChange={(planAlignmentNotes) =>
                update({ planAlignmentNotes })
              }
            />
          )}
          <ChoiceRow label="Progress information reviewed">
            <RadioGroup
              name="home-mentor-progress-reviewed"
              value={form.progressReviewed}
              disabled={saved}
              onChange={(progressReviewed) =>
                update({ progressReviewed: progressReviewed as YesNo })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Home programme requirements at risk">
            <RadioGroup
              name="home-mentor-requirements-risk"
              value={form.homeRequirementsAtRisk}
              disabled={saved}
              onChange={(homeRequirementsAtRisk) =>
                update({
                  homeRequirementsAtRisk: homeRequirementsAtRisk as YesNo,
                  homeRequirementsExplain:
                    homeRequirementsAtRisk === "yes"
                      ? form.homeRequirementsExplain
                      : "",
                })
              }
              options={[
                ["no", "No"],
                ["yes", "Yes — explain"],
              ]}
            />
          </ChoiceRow>
          {form.homeRequirementsAtRisk === "yes" && (
            <TextRow
              label="Explain home programme requirements at risk"
              value={form.homeRequirementsExplain}
              disabled={saved}
              multiline
              onChange={(homeRequirementsExplain) =>
                update({ homeRequirementsExplain })
              }
            />
          )}
          <ChoiceRow label="Credit recognition concerns">
            <RadioGroup
              name="home-mentor-credit-concerns"
              value={form.creditRecognitionConcerns}
              disabled={saved}
              onChange={(creditRecognitionConcerns) =>
                update({
                  creditRecognitionConcerns:
                    creditRecognitionConcerns as YesNo,
                  creditRecognitionDetails:
                    creditRecognitionConcerns === "yes"
                      ? form.creditRecognitionDetails
                      : "",
                })
              }
              options={[
                ["no", "None"],
                ["yes", "Details"],
              ]}
            />
          </ChoiceRow>
          {form.creditRecognitionConcerns === "yes" && (
            <TextRow
              label="Credit recognition concern details"
              value={form.creditRecognitionDetails}
              disabled={saved}
              multiline
              onChange={(creditRecognitionDetails) =>
                update({ creditRecognitionDetails })
              }
            />
          )}
          <TextRow
            label="Advice/support provided"
            value={form.adviceSupport}
            disabled={saved}
            multiline
            rows={4}
            onChange={(adviceSupport) => update({ adviceSupport })}
          />
          <TextRow
            label="Reintegration/recognition actions required"
            value={form.reintegrationActions}
            disabled={saved}
            multiline
            rows={4}
            onChange={(reintegrationActions) =>
              update({ reintegrationActions })
            }
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Contact with host supervisor
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">Date(s)</th>
                <th className="border border-slate-300 px-2 py-2">Method</th>
                <th className="border border-slate-300 px-2 py-2">Outcome</th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.contacts.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="date"
                      value={row.date}
                      disabled={saved}
                      onChange={(event) =>
                        updateContact(row.id, { date: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <select
                      value={row.method}
                      disabled={saved}
                      onChange={(event) =>
                        updateContact(row.id, {
                          method: event.target.value as ContactMethod,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    >
                      <option value="">—</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                    </select>
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.outcome}
                      disabled={saved}
                      onChange={(event) =>
                        updateContact(row.id, { outcome: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            contacts: form.contacts.filter(
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
                update({ contacts: [...form.contacts, newContact()] })
              }
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another contact
            </button>
          )}
        </section>

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
              role: "Home Academic Mentor",
              name: form.mentorName.trim() || "Pending",
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Host Academic Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Host Focal Person",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Coordinator",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Quality Assurance Officer",
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
            Home academic mentor review signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign home academic mentor review"}
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
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
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
          type="text"
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
