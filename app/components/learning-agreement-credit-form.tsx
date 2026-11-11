"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The Host Institution confirms availability of Table A components; the Home Institution commits to recognise successfully completed components as described in Table B; the parties will report programme or period changes.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type SexOption = "" | "m" | "f" | "other";
type StudyCycle = "" | "masters" | "phd" | "other";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  areaOfStudy: string;
};

type HostComponent = {
  id: string;
  code: string;
  title: string;
  semester: string;
  credits: string;
};

type HomeComponent = {
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
  studyCycle: StudyCycle;
  fieldOfEducation: string;
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
  tableA: HostComponent[];
  tableB: HomeComponent[];
  provisionsIfNotCompleted: string;
  learningOutcomes: string;
  assessmentMethods: string;
  creditSystem: string;
  catalogueAttached: boolean;
  catalogueFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function newHostComponent(): HostComponent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: "",
    title: "",
    semester: "",
    credits: "",
  };
}

function newHomeComponent(): HomeComponent {
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
  studyCycle: "",
  fieldOfEducation: "",
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
  tableA: [newHostComponent()],
  tableB: [newHomeComponent()],
  provisionsIfNotCompleted: "",
  learningOutcomes: "",
  assessmentMethods: "",
  creditSystem: "",
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

function mapStudyCycle(type: string): StudyCycle {
  if (/phd/i.test(type)) return "phd";
  if (/msc|master/i.test(type)) return "masters";
  if (type.trim()) return "other";
  return "";
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
  return `smecc2e.learning-agreement-credit.${applicationId}`;
}

export function LearningAgreementCreditForm({
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
          tableA: [newHostComponent()],
          tableB: [newHomeComponent()],
          sex: mapSex(app?.gender),
          studyCycle: mapStudyCycle(app?.typeOfMobility ?? ""),
          fieldOfEducation: app?.proposedAcademicProgramme?.trim() ?? "",
          homeName: home === "—" ? "" : home,
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        tableA:
          parsed.tableA && parsed.tableA.length > 0
            ? parsed.tableA
            : [newHostComponent()],
        tableB:
          parsed.tableB && parsed.tableB.length > 0
            ? parsed.tableB
            : [newHomeComponent()],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        tableA: [newHostComponent()],
        tableB: [newHomeComponent()],
      });
    }
  }, [
    applicationId,
    app?.gender,
    app?.typeOfMobility,
    app?.proposedAcademicProgramme,
    app?.masterProgrammeUniversity,
    app?.bachelorProgrammeUniversity,
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
  const totalHostCredits = form.tableA.reduce(
    (sum, row) => sum + parseCredits(row.credits),
    0
  );
  const totalHomeCredits = form.tableB.reduce(
    (sum, row) => sum + parseCredits(row.credits),
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

  const updateTableA = (id: string, patch: Partial<HostComponent>) => {
    update({
      tableA: form.tableA.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const updateTableB = (id: string, patch: Partial<HomeComponent>) => {
    update({
      tableB: form.tableB.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const sign = () => {
    if (saved) return;
    if (!form.homeName.trim() || !form.hostName.trim()) {
      setError("Enter both home and host institution names.");
      return;
    }
    if (!form.tableA.some((row) => row.title.trim() || row.code.trim())) {
      setError("Enter at least one Table A host component.");
      return;
    }
    if (!form.tableB.some((row) => row.title.trim() || row.code.trim())) {
      setError("Enter at least one Table B home recognition component.");
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
            Learning agreement — credit-seeking mobility
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Credit-seeking student + Home supervisor & Host
            institution supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Use the approved three-party Learning Agreement and guarantee planned
          recognition of successfully completed host components.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="la-credit-cohort"
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
              name="la-credit-sex"
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
          <ChoiceRow label="Study cycle">
            <RadioGroup
              name="la-credit-cycle"
              value={form.studyCycle}
              disabled={saved}
              onChange={(studyCycle) =>
                update({ studyCycle: studyCycle as StudyCycle })
              }
              options={[
                ["masters", "Masters"],
                ["phd", "PhD"],
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
        </FormTable>

        <FormTable title="Home institution">
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
            placeholder="Name / email / phone"
            onChange={(homeContact) => update({ homeContact })}
          />
        </FormTable>

        <FormTable title="Host institution">
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
            placeholder="Name / email / phone"
            onChange={(hostContact) => update({ hostContact })}
          />
        </FormTable>

        <ComponentTable
          title="Table A — Host study programme (filled and signed before mobility)"
          rows={form.tableA}
          disabled={saved}
          onChange={updateTableA}
          onAdd={() => update({ tableA: [...form.tableA, newHostComponent()] })}
          onRemove={(id) => {
            if (form.tableA.length <= 1) return;
            update({ tableA: form.tableA.filter((row) => row.id !== id) });
          }}
          totalLabel="Total host credits"
          totalValue={formatCredits(totalHostCredits)}
          codeLabel="Component/Course code at Host HEI"
          titleLabel="Component title at the Host Institution"
          semesterLabel="Semester at Host HEI"
          creditsLabel="Number of agreed credits (or equivalent) to be awarded by the Host Institution upon successful completion"
        />

        <ComponentTable
          title="Table B — Recognition at Home Institution (filled and signed before mobility)"
          rows={form.tableB}
          disabled={saved}
          onChange={updateTableB}
          onAdd={() => update({ tableB: [...form.tableB, newHomeComponent()] })}
          onRemove={(id) => {
            if (form.tableB.length <= 1) return;
            update({ tableB: form.tableB.filter((row) => row.id !== id) });
          }}
          totalLabel="Total home credits"
          totalValue={formatCredits(totalHomeCredits)}
          codeLabel="Component/Course code at Home HEI"
          titleLabel="Component title at the Home Institution"
          semesterLabel="Semester at Home HEI"
          creditsLabel="Number of credits (or equivalent) to be recognised by the Home Institution"
        />

        <FormTable title="Provisions">
          <TextRow
            label="Provisions if components are not successfully completed"
            value={form.provisionsIfNotCompleted}
            disabled={saved}
            multiline
            onChange={(provisionsIfNotCompleted) =>
              update({ provisionsIfNotCompleted })
            }
          />
        </FormTable>

        <FormTable title="Academic recognition detail">
          <TextRow
            label="Expected learning outcomes"
            value={form.learningOutcomes}
            disabled={saved}
            multiline
            placeholder="Per component / overall"
            onChange={(learningOutcomes) => update({ learningOutcomes })}
          />
          <TextRow
            label="Assessment methods"
            value={form.assessmentMethods}
            disabled={saved}
            multiline
            placeholder="Per component / overall"
            onChange={(assessmentMethods) => update({ assessmentMethods })}
          />
          <TextRow
            label="ACTS/compatible credit system used"
            value={form.creditSystem}
            disabled={saved}
            onChange={(creditSystem) => update({ creditSystem })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Relevant course catalogue extracts / mapping evidence if required"
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

        <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <p className="font-bold text-[#062763]">Notes</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>Additional rows and columns can be added as needed in all tables.</li>
            <li>
              An “educational component” is a self-contained and formal
              structured learning experience that features learning outcomes,
              credits and forms of assessment.
            </li>
            <li>
              Course catalogue: up-to-date information on the institution’s
              learning environment that should be available to students before
              the mobility period.
            </li>
            <li>
              All parties must sign the Learning Agreement before the start of
              the mobility. Scanned or digital signatures may be accepted.
            </li>
            <li>
              The responsible person at the Home Institution is an academic who
              has the authority to approve the Learning Agreement and guarantee
              full recognition.
            </li>
            <li>
              The responsible person at the Host Institution is an academic who
              has the authority to approve the Learning Agreement and amend it
              when needed.
            </li>
          </ol>
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

function ComponentTable({
  title,
  rows,
  disabled,
  onChange,
  onAdd,
  onRemove,
  totalLabel,
  totalValue,
  codeLabel,
  titleLabel,
  semesterLabel,
  creditsLabel,
}: {
  title: string;
  rows: { id: string; code: string; title: string; semester: string; credits: string }[];
  disabled: boolean;
  onChange: (
    id: string,
    patch: Partial<{ code: string; title: string; semester: string; credits: string }>
  ) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  totalLabel: string;
  totalValue: string;
  codeLabel: string;
  titleLabel: string;
  semesterLabel: string;
  creditsLabel: string;
}) {
  return (
    <section className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
          {title}
        </caption>
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <th className="border border-slate-300 px-2 py-2">{codeLabel}</th>
            <th className="border border-slate-300 px-2 py-2">{titleLabel}</th>
            <th className="border border-slate-300 px-2 py-2">
              {semesterLabel}
            </th>
            <th className="border border-slate-300 px-2 py-2">
              {creditsLabel}
            </th>
            <th className="border border-slate-300 px-2 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={row.code}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(row.id, { code: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={row.title}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(row.id, { title: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={row.semester}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(row.id, { semester: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                <input
                  type="text"
                  value={row.credits}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(row.id, { credits: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                />
              </td>
              <td className="border border-slate-300 px-2 py-2">
                {!disabled && rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove(row.id)}
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
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
        >
          Add another component
        </button>
      )}
      <p className="mt-2 text-sm font-semibold text-[#062763]">
        {totalLabel}: {totalValue}
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
