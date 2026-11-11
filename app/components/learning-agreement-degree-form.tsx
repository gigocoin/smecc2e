"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "By signing, the student and Host Institution approve the Learning Agreement and confirm that listed components are aligned with the host programme.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type SexOption = "" | "m" | "f" | "other";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  areaOfStudy: string;
};

type CourseComponent = {
  id: string;
  code: string;
  title: string;
  semester: string;
  credits: string;
};

type FormState = {
  cohort: Cohort;
  dateOfBirth: string;
  sex: SexOption;
  fieldOfEducation: string;
  previousDegree: string;
  awardingInstitution: string;
  hostInstitutionName: string;
  hostFaculty: string;
  hostAddress: string;
  hostCountry: string;
  hostContact: string;
  degreeType: string;
  degreeTitle: string;
  components: CourseComponent[];
  catalogueAttached: boolean;
  catalogueFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function newComponent(): CourseComponent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: "",
    title: "",
    semester: "",
    credits: "",
  };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  dateOfBirth: "",
  sex: "",
  fieldOfEducation: "",
  previousDegree: "",
  awardingInstitution: "",
  hostInstitutionName: "",
  hostFaculty: "",
  hostAddress: "",
  hostCountry: "",
  hostContact: "",
  degreeType: "",
  degreeTitle: "",
  components: [newComponent()],
  catalogueAttached: false,
  catalogueFileName: "",
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

function mapSex(gender: string | null | undefined): SexOption {
  const value = gender?.trim().toLowerCase() ?? "";
  if (value.startsWith("m")) return "m";
  if (value.startsWith("f")) return "f";
  if (value) return "other";
  return "";
}

function parseCredits(value: string): number {
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function storageKey(applicationId: string): string {
  return `smecc2e.learning-agreement-degree.${applicationId}`;
}

export function LearningAgreementDegreeForm({
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
          components: [newComponent()],
          sex: mapSex(app?.gender),
          fieldOfEducation: app?.proposedAcademicProgramme?.trim() ?? "",
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        components:
          parsed.components && parsed.components.length > 0
            ? parsed.components
            : [newComponent()],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({ ...EMPTY_FORM, components: [newComponent()] });
    }
  }, [applicationId, app?.gender, app?.proposedAcademicProgramme]);

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
              areaOfStudy?: string;
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
          areaOfStudy: data.letter.editable?.areaOfStudy ?? "",
        });
      } catch {
        setLetter(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lastName = app?.surname?.trim() || "Pending";
  const firstName =
    [app?.firstName, app?.middleName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || displayName;
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
  const totalCredits = form.components.reduce(
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

  const updateComponent = (id: string, patch: Partial<CourseComponent>) => {
    update({
      components: form.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component
      ),
    });
  };

  const addComponent = () => {
    update({ components: [...form.components, newComponent()] });
  };

  const removeComponent = (id: string) => {
    if (form.components.length <= 1) return;
    update({
      components: form.components.filter((component) => component.id !== id),
    });
  };

  const sign = () => {
    if (saved) return;
    if (!form.hostInstitutionName.trim()) {
      setError("Enter the degree-awarding host institution name.");
      return;
    }
    if (!form.degreeType.trim() || !form.degreeTitle.trim()) {
      setError("Enter the type and title of the degree to be awarded.");
      return;
    }
    if (
      !form.components.some(
        (component) => component.title.trim() || component.code.trim()
      )
    ) {
      setError("Enter at least one programme component/course.");
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
            Learning agreement — degree-seeking mobility
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Degree-seeking student + Host institution
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Use the approved SMECC2E degree-seeking Learning Agreement structure
          before mobility and preserve it as the binding academic plan.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="la-degree-cohort"
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

        <FormTable title="Participant & mobility details">
          <ReadRow
            label="Mobility start date"
            value={pending(letter?.startDate)}
          />
          <ReadRow
            label="Mobility end date"
            value={pending(letter?.endDate)}
          />
          <ReadRow label="Last name(s)" value={lastName} />
          <ReadRow label="First name(s)" value={firstName} />
          <TextRow
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            disabled={saved}
            onChange={(dateOfBirth) => update({ dateOfBirth })}
          />
          <ReadRow
            label="Nationality"
            value={pending(letter?.nationality || app?.nationality)}
          />
          <ChoiceRow label="Sex">
            <RadioGroup
              name="la-degree-sex"
              value={form.sex}
              disabled={saved}
              onChange={(sex) => update({ sex: sex as SexOption })}
              options={[
                ["m", "M"],
                ["f", "F"],
                ["other", "Other"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Field of education"
            value={form.fieldOfEducation || letter?.areaOfStudy || ""}
            disabled={saved}
            onChange={(fieldOfEducation) => update({ fieldOfEducation })}
          />
          <TextRow
            label="Previous degree received"
            value={form.previousDegree}
            disabled={saved}
            placeholder="Type and title"
            onChange={(previousDegree) => update({ previousDegree })}
          />
          <TextRow
            label="Awarding institution"
            value={form.awardingInstitution}
            disabled={saved}
            placeholder="Name and country"
            onChange={(awardingInstitution) =>
              update({ awardingInstitution })
            }
          />
        </FormTable>

        <FormTable title="Degree-awarding host institution">
          <TextRow
            label="Institution name"
            value={form.hostInstitutionName}
            disabled={saved}
            onChange={(hostInstitutionName) =>
              update({ hostInstitutionName })
            }
          />
          <TextRow
            label="Faculty/Department"
            value={form.hostFaculty}
            disabled={saved}
            onChange={(hostFaculty) => update({ hostFaculty })}
          />
          <TextRow
            label="Address"
            value={form.hostAddress}
            disabled={saved}
            multiline
            onChange={(hostAddress) => update({ hostAddress })}
          />
          <TextRow
            label="Country"
            value={form.hostCountry}
            disabled={saved}
            onChange={(hostCountry) => update({ hostCountry })}
          />
          <TextRow
            label="Contact person"
            value={form.hostContact}
            disabled={saved}
            placeholder="Name / email / phone"
            onChange={(hostContact) => update({ hostContact })}
          />
        </FormTable>

        <FormTable title="Degree & study programme">
          <TextRow
            label="Type of degree to be awarded"
            value={form.degreeType}
            disabled={saved}
            onChange={(degreeType) => update({ degreeType })}
          />
          <TextRow
            label="Title of degree"
            value={form.degreeTitle}
            disabled={saved}
            onChange={(degreeTitle) => update({ degreeTitle })}
          />
          <ReadRow
            label="Total credits/equivalent"
            value={
              totalCredits > 0
                ? totalCredits.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "Pending calculation"
            }
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Programme components
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">
                  Component/Course code
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Component/Course title
                </th>
                <th className="border border-slate-300 px-2 py-2">Semester</th>
                <th className="border border-slate-300 px-2 py-2">
                  Agreed credits/equivalent
                </th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.components.map((component) => (
                <tr key={component.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={component.code}
                      disabled={saved}
                      onChange={(event) =>
                        updateComponent(component.id, {
                          code: event.target.value,
                        })
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
                        updateComponent(component.id, {
                          title: event.target.value,
                        })
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
                        updateComponent(component.id, {
                          semester: event.target.value,
                        })
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
                        updateComponent(component.id, {
                          credits: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComponent(component.id)}
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
              onClick={addComponent}
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another component
            </button>
          )}
          <p className="mt-2 text-sm font-semibold text-[#062763]">
            Total credits:{" "}
            {totalCredits > 0
              ? totalCredits.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "Pending"}
          </p>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Course catalogue or programme documentation where needed"
              checked={form.catalogueAttached}
              fileName={form.catalogueFileName}
              disabled={saved}
              onCheckedChange={(catalogueAttached) =>
                update({
                  catalogueAttached,
                  catalogueFileName: catalogueAttached
                    ? form.catalogueFileName
                    : "",
                })
              }
              onFileNameChange={(catalogueFileName) =>
                update({ catalogueAttached: true, catalogueFileName })
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
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
            {
              role: "Responsible person at Host Institution",
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
            Learning agreement signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign learning agreement"}
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
