"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type SexOption = "" | "m" | "f" | "other";
type StaffType = "" | "administrative" | "academic" | "technical";
type ActivityType =
  | ""
  | "teaching"
  | "training"
  | "administrative"
  | "curriculum"
  | "other";
type TeachingLevel = "" | "master" | "doctoral" | "other" | "na";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  areaOfStudy: string;
};

type FormState = {
  cohort: Cohort;
  sex: SexOption;
  typeOfStaff: StaffType;
  email: string;
  phone: string;
  homeName: string;
  homeFaculty: string;
  homeAddress: string;
  homeCountry: string;
  homeContact: string;
  hostName: string;
  hostFaculty: string;
  hostAddress: string;
  hostCountry: string;
  hostContact: string;
  activityType: ActivityType;
  mainSubjectField: string;
  teachingHours: string;
  language: string;
  teachingLevel: TeachingLevel;
  studentsBenefiting: string;
  overallObjective: string;
  addedValue: string;
  contentActivities: string;
  professionalDevelopment: string;
  capacityBuilding: string;
  studentCompetences: string;
  otherOutcomes: string;
  workplanAttached: boolean;
  workplanFileName: string;
  declareApprove: boolean;
  declareHomeSupport: boolean;
  declareShareExperience: boolean;
  declareStaffAgreement: boolean;
  declareCommunicate: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  sex: "",
  typeOfStaff: "",
  email: "",
  phone: "",
  homeName: "",
  homeFaculty: "",
  homeAddress: "",
  homeCountry: "",
  homeContact: "",
  hostName: "",
  hostFaculty: "",
  hostAddress: "",
  hostCountry: "",
  hostContact: "",
  activityType: "",
  mainSubjectField: "",
  teachingHours: "",
  language: "",
  teachingLevel: "",
  studentsBenefiting: "",
  overallObjective: "",
  addedValue: "",
  contentActivities: "",
  professionalDevelopment: "",
  capacityBuilding: "",
  studentCompetences: "",
  otherOutcomes: "",
  workplanAttached: false,
  workplanFileName: "",
  declareApprove: false,
  declareHomeSupport: false,
  declareShareExperience: false,
  declareStaffAgreement: false,
  declareCommunicate: false,
  signature: "",
  signedAt: "",
};

function pending(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || text === "[pending]" || text === "—") return "Pending";
  return text;
}

function mapSex(gender: string | null | undefined): SexOption {
  const value = gender?.trim().toLowerCase() ?? "";
  if (value.startsWith("m")) return "m";
  if (value.startsWith("f")) return "f";
  if (value) return "other";
  return "";
}

function storageKey(applicationId: string): string {
  return `smecc2e.mobility-agreement-staff.${applicationId}`;
}

export function MobilityAgreementStaffForm({
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
        const home = applicantHomeInstitution({
          masterProgrammeUniversity: app?.masterProgrammeUniversity,
          bachelorProgrammeUniversity: app?.bachelorProgrammeUniversity,
        });
        setForm({
          ...EMPTY_FORM,
          sex: mapSex(app?.gender),
          email: user.email,
          phone: app?.phoneNumber?.trim() ?? "",
          homeName: home === "—" ? "" : home,
          mainSubjectField: app?.proposedAcademicProgramme?.trim() ?? "",
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({ ...EMPTY_FORM, ...parsed });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm(EMPTY_FORM);
    }
  }, [
    applicationId,
    app?.gender,
    app?.phoneNumber,
    app?.proposedAcademicProgramme,
    app?.masterProgrammeUniversity,
    app?.bachelorProgrammeUniversity,
    user.email,
  ]);

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

  const fullName = useMemo(() => {
    const parts = [app?.firstName, app?.middleName, app?.surname]
      .map((part) => part?.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : displayName;
  }, [app?.firstName, app?.middleName, app?.surname, displayName]);

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
    if (!form.typeOfStaff) {
      setError("Choose the type of staff.");
      return;
    }
    if (!form.activityType) {
      setError("Choose the type of activity.");
      return;
    }
    if (!form.overallObjective.trim()) {
      setError("Enter the overall objective of the mobility.");
      return;
    }
    if (!form.contentActivities.trim()) {
      setError("Enter the content/activities to be carried out.");
      return;
    }
    if (
      !form.declareApprove ||
      !form.declareHomeSupport ||
      !form.declareShareExperience ||
      !form.declareStaffAgreement ||
      !form.declareCommunicate
    ) {
      setError("Confirm all declaration statements before you sign.");
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
            Mobility agreement — staff mobility
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Staff member + Home & Host institutions
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Implement the approved SMECC2E staff mobility agreement structure.
        </p>

        <FormTable title="Staff member">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="staff-ma-cohort"
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
          <ReadRow label="Mobility category" value="Staff" />
          <ReadRow label="Mobility type" value="Staff" />
          <ReadRow
            label="Home institution"
            value={pending(homeInstitution === "—" ? "" : homeInstitution)}
          />
          <ReadRow
            label="Host institution / organization"
            value={pending(letter?.host || app?.preferredHostInstitution)}
          />
          <ChoiceRow label="Sex">
            <RadioGroup
              name="staff-ma-sex"
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
          <ChoiceRow label="Type of staff">
            <RadioGroup
              name="staff-type"
              value={form.typeOfStaff}
              disabled={saved}
              onChange={(typeOfStaff) =>
                update({ typeOfStaff: typeOfStaff as StaffType })
              }
              options={[
                ["administrative", "Administrative"],
                ["academic", "Academic"],
                ["technical", "Technical"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Email"
            type="email"
            value={form.email}
            disabled={saved}
            onChange={(email) => update({ email })}
          />
          <TextRow
            label="Phone"
            value={form.phone}
            disabled={saved}
            onChange={(phone) => update({ phone })}
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

        <FormTable title="Home institution supervisor/contact person">
          <TextRow
            label="Name"
            value={form.homeName}
            disabled={saved}
            onChange={(homeName) => update({ homeName })}
          />
          <TextRow
            label="Faculty/Department"
            value={form.homeFaculty}
            disabled={saved}
            onChange={(homeFaculty) => update({ homeFaculty })}
          />
          <TextRow
            label="Address"
            value={form.homeAddress}
            disabled={saved}
            multiline
            onChange={(homeAddress) => update({ homeAddress })}
          />
          <TextRow
            label="Country"
            value={form.homeCountry}
            disabled={saved}
            onChange={(homeCountry) => update({ homeCountry })}
          />
          <TextRow
            label="Contact person"
            value={form.homeContact}
            disabled={saved}
            placeholder="Name/email/phone"
            onChange={(homeContact) => update({ homeContact })}
          />
        </FormTable>

        <FormTable title="Host institution supervisor/contact person">
          <TextRow
            label="Name"
            value={form.hostName}
            disabled={saved}
            onChange={(hostName) => update({ hostName })}
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
            placeholder="Name/email/phone"
            onChange={(hostContact) => update({ hostContact })}
          />
        </FormTable>

        <FormTable title="Proposed mobility programme">
          <ChoiceRow label="Type of activity">
            <RadioGroup
              name="activity-type"
              value={form.activityType}
              disabled={saved}
              onChange={(activityType) =>
                update({ activityType: activityType as ActivityType })
              }
              options={[
                ["teaching", "Teaching"],
                ["training", "Training"],
                ["administrative", "Administrative assignment"],
                ["curriculum", "Curriculum development"],
                ["other", "Other"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Main subject field"
            value={form.mainSubjectField || letter?.areaOfStudy || ""}
            disabled={saved}
            onChange={(mainSubjectField) => update({ mainSubjectField })}
          />
          <TextRow
            label="Teaching/training hours"
            value={form.teachingHours}
            disabled={saved}
            placeholder="Number, if applicable"
            onChange={(teachingHours) => update({ teachingHours })}
          />
          <TextRow
            label="Language of teaching/training"
            value={form.language}
            disabled={saved}
            onChange={(language) => update({ language })}
          />
          <ChoiceRow label="Level of teaching">
            <RadioGroup
              name="teaching-level"
              value={form.teachingLevel}
              disabled={saved}
              onChange={(teachingLevel) =>
                update({ teachingLevel: teachingLevel as TeachingLevel })
              }
              options={[
                ["master", "Master"],
                ["doctoral", "Doctoral"],
                ["other", "Other"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Number of students benefiting"
            value={form.studentsBenefiting}
            disabled={saved}
            placeholder="Number, if applicable"
            onChange={(studentsBenefiting) => update({ studentsBenefiting })}
          />
          <TextRow
            label="Overall objective of the mobility"
            value={form.overallObjective}
            disabled={saved}
            multiline
            onChange={(overallObjective) => update({ overallObjective })}
          />
          <TextRow
            label="Added value of the mobility (in the context of the modernization and internationalization strategies of the institutions involved)"
            value={form.addedValue}
            disabled={saved}
            multiline
            onChange={(addedValue) => update({ addedValue })}
          />
          <TextRow
            label="Content/activities to be carried out"
            value={form.contentActivities}
            disabled={saved}
            multiline
            onChange={(contentActivities) => update({ contentActivities })}
          />
          <TextRow
            label="Expected outcomes and impact — professional development"
            value={form.professionalDevelopment}
            disabled={saved}
            multiline
            onChange={(professionalDevelopment) =>
              update({ professionalDevelopment })
            }
          />
          <TextRow
            label="Expected outcomes and impact — capacity building"
            value={form.capacityBuilding}
            disabled={saved}
            multiline
            onChange={(capacityBuilding) => update({ capacityBuilding })}
          />
          <TextRow
            label="Expected outcomes and impact — student competences"
            value={form.studentCompetences}
            disabled={saved}
            multiline
            onChange={(studentCompetences) => update({ studentCompetences })}
          />
          <TextRow
            label="Expected outcomes and impact — other"
            value={form.otherOutcomes}
            disabled={saved}
            multiline
            onChange={(otherOutcomes) => update({ otherOutcomes })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Upload the Workplan"
              checked={form.workplanAttached}
              fileName={form.workplanFileName}
              disabled={saved}
              onCheckedChange={(workplanAttached) =>
                update({
                  workplanAttached,
                  workplanFileName: workplanAttached
                    ? form.workplanFileName
                    : "",
                })
              }
              onFileNameChange={(workplanFileName) =>
                update({ workplanAttached: true, workplanFileName })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Declaration / commitment
          </h2>
          <div className="mt-3 space-y-3 px-1 text-sm leading-6 text-slate-700">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareApprove}
                disabled={saved}
                onChange={(event) =>
                  update({ declareApprove: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                The staff member, Home Institution and Host Institution approve
                the programme; the Home Institution will recognise the mobility
                in staff evaluation, and changes/problems will be communicated.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareHomeSupport}
                disabled={saved}
                onChange={(event) =>
                  update({ declareHomeSupport: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                The Home Institution supports the staff mobility as part of its
                modernization and internationalization strategy and will
                recognise it as a component in any evaluation or assessment of
                the staff member.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareShareExperience}
                disabled={saved}
                onChange={(event) =>
                  update({ declareShareExperience: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                The staff member commits to share his/her experience upon return
                at the Home Institution as a source of inspiration to other
                colleagues.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareStaffAgreement}
                disabled={saved}
                onChange={(event) =>
                  update({ declareStaffAgreement: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                The staff member and the Host Institution commit to the
                requirements set out in the “Staff Agreement” signed between
                them.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareCommunicate}
                disabled={saved}
                onChange={(event) =>
                  update({ declareCommunicate: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                The staff member and the Host Institution will communicate to
                the Home Institution any problems or changes regarding the
                proposed mobility programme or mobility period.
              </span>
            </label>
          </div>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Staff member",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
            {
              role: "Responsible person at Home Institution",
              name: form.homeName.trim() || "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Responsible person at Host Institution",
              name: form.hostName.trim() || "Pending",
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
            Staff mobility agreement signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign mobility agreement"}
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
  type?: "text" | "email";
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
