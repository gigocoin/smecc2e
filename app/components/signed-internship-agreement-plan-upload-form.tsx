"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The parties accept the Internship rights and obligations, reporting requirements, professional conduct requirements and written-amendment procedure.";

const THEMATIC_OPTIONS = [
  ["sustainable_energy", "Sustainable Energy"],
  ["sustainable_materials", "Sustainable Materials"],
  ["climate_change", "Climate Change"],
  ["energy_economics", "Energy Economics"],
  ["energy_policy", "Energy Policy"],
  ["environment", "Environment"],
] as const;

const GATEWAY_OPTIONS = [
  ["climate_and_energy", "Climate and Energy"],
  ["transport", "Transport"],
  ["education_and_research", "Education and Research"],
  ["digital", "Digital"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type YesNo = "" | "yes" | "no";
type ThematicKey = (typeof THEMATIC_OPTIONS)[number][0];
type GatewayKey = (typeof GATEWAY_OPTIONS)[number][0];

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type FormState = {
  cohort: Cohort;
  sendingName: string;
  sendingAddress: string;
  sendingContact: string;
  receivingName: string;
  receivingAddress: string;
  receivingContact: string;
  programmeOfStudy: string;
  internshipLocations: string;
  startDate: string;
  endDate: string;
  thematicAreas: ThematicKey[];
  gatewayPriorities: GatewayKey[];
  handsOnModule: string;
  learningObjectives: string;
  activitiesTasks: string;
  competencies: string;
  assessmentMethods: string;
  expectedDeliverables: string;
  supervisors: string;
  insuranceVerified: YesNo;
  monitoringMethod: string;
  disputeContact: string;
  agreementAttached: boolean;
  agreementFileName: string;
  planAttached: boolean;
  planFileName: string;
  insuranceAttached: boolean;
  insuranceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  sendingName: "",
  sendingAddress: "",
  sendingContact: "",
  receivingName: "",
  receivingAddress: "",
  receivingContact: "",
  programmeOfStudy: "",
  internshipLocations: "",
  startDate: "",
  endDate: "",
  thematicAreas: [],
  gatewayPriorities: [],
  handsOnModule: "",
  learningObjectives: "",
  activitiesTasks: "",
  competencies: "",
  assessmentMethods: "",
  expectedDeliverables: "",
  supervisors: "",
  insuranceVerified: "",
  monitoringMethod: "",
  disputeContact: "",
  agreementAttached: false,
  agreementFileName: "",
  planAttached: false,
  planFileName: "",
  insuranceAttached: false,
  insuranceFileName: "",
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
  return `smecc2e.signed-internship-agreement-plan-upload.${applicationId}`;
}

export function SignedInternshipAgreementPlanUploadForm({
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
      const home = applicantHomeInstitution({
        masterProgrammeUniversity: app?.masterProgrammeUniversity,
        bachelorProgrammeUniversity: app?.bachelorProgrammeUniversity,
      });
      if (!raw) {
        setForm({
          ...EMPTY_FORM,
          sendingName: home === "—" ? "" : home,
          programmeOfStudy: app?.proposedAcademicProgramme?.trim() ?? "",
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        thematicAreas: parsed.thematicAreas ?? [],
        gatewayPriorities: parsed.gatewayPriorities ?? [],
        sendingName:
          parsed.sendingName || (home === "—" ? "" : home),
        programmeOfStudy:
          parsed.programmeOfStudy ||
          (app?.proposedAcademicProgramme?.trim() ?? ""),
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({ ...EMPTY_FORM });
    }
  }, [
    applicationId,
    app?.bachelorProgrammeUniversity,
    app?.masterProgrammeUniversity,
    app?.proposedAcademicProgramme,
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

  const toggleThematic = (value: ThematicKey) => {
    if (saved) return;
    update({
      thematicAreas: form.thematicAreas.includes(value)
        ? form.thematicAreas.filter((item) => item !== value)
        : [...form.thematicAreas, value],
    });
  };

  const toggleGateway = (value: GatewayKey) => {
    if (saved) return;
    update({
      gatewayPriorities: form.gatewayPriorities.includes(value)
        ? form.gatewayPriorities.filter((item) => item !== value)
        : [...form.gatewayPriorities, value],
    });
  };

  const sign = () => {
    if (saved) return;
    if (!form.sendingName.trim()) {
      setError("Enter the sending institution / host university name.");
      return;
    }
    if (!form.receivingName.trim()) {
      setError("Enter the receiving institution/organisation name.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Enter the internship start and end dates.");
      return;
    }
    if (form.thematicAreas.length === 0) {
      setError("Select at least one SMECC2E thematic area.");
      return;
    }
    if (!form.learningObjectives.trim() || !form.activitiesTasks.trim()) {
      setError("Enter learning objectives and activities/tasks.");
      return;
    }
    if (!form.supervisors.trim()) {
      setError("Enter supervisor name/role/contact.");
      return;
    }
    if (!form.insuranceVerified) {
      setError("Indicate whether insurance proof has been verified.");
      return;
    }
    if (!form.agreementAttached || !form.planAttached) {
      setError("Attach the signed internship agreement and internship plan.");
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
            Internship agreement & plan upload form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Trainee + Sending institution + Receiving institution
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Execute the SMECC2E Internship agreement and detailed learning
          programme.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="internship-agreement-cohort"
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

        <FormTable title="Parties & trainee">
          <TextRow
            label="Sending institution — Name of Host University"
            value={form.sendingName}
            disabled={saved}
            onChange={(sendingName) => update({ sendingName })}
          />
          <TextRow
            label="Sending institution — Address"
            value={form.sendingAddress}
            disabled={saved}
            multiline
            onChange={(sendingAddress) => update({ sendingAddress })}
          />
          <TextRow
            label="Sending institution — Contact"
            value={form.sendingContact}
            disabled={saved}
            onChange={(sendingContact) => update({ sendingContact })}
          />
          <TextRow
            label="Receiving institution/organisation — Name of Organization offering the Internship"
            value={form.receivingName}
            disabled={saved}
            onChange={(receivingName) => update({ receivingName })}
          />
          <TextRow
            label="Receiving institution/organisation — Address"
            value={form.receivingAddress}
            disabled={saved}
            multiline
            onChange={(receivingAddress) => update({ receivingAddress })}
          />
          <TextRow
            label="Receiving institution/organisation — Contact"
            value={form.receivingContact}
            disabled={saved}
            onChange={(receivingContact) => update({ receivingContact })}
          />
          <ReadRow label="Full names of Trainee/Scholar" value={fullName} />
          <TextRow
            label="Programme of study"
            value={form.programmeOfStudy}
            disabled={saved}
            onChange={(programmeOfStudy) => update({ programmeOfStudy })}
          />
          <TextRow
            label="Internship location(s)"
            value={form.internshipLocations}
            disabled={saved}
            onChange={(internshipLocations) =>
              update({ internshipLocations })
            }
          />
          <TextRow
            label="Start date"
            type="date"
            value={form.startDate}
            disabled={saved}
            onChange={(startDate) => update({ startDate })}
          />
          <TextRow
            label="End date"
            type="date"
            value={form.endDate}
            disabled={saved}
            onChange={(endDate) => update({ endDate })}
          />
        </FormTable>

        <FormTable title="Internship programme">
          <ChoiceRow label="Selected SMECC2E thematic areas">
            <div className="flex flex-col gap-2">
              {THEMATIC_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.thematicAreas.includes(value)}
                    disabled={saved}
                    onChange={() => toggleThematic(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </ChoiceRow>
          <ChoiceRow label="Relevant Global Gateway Priorities covered">
            <div className="flex flex-col gap-2">
              {GATEWAY_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.gatewayPriorities.includes(value)}
                    disabled={saved}
                    onChange={() => toggleGateway(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </ChoiceRow>
          <TextRow
            label="Hands-on module/programme"
            value={form.handsOnModule}
            disabled={saved}
            placeholder="See attached Internship plan"
            multiline
            onChange={(handsOnModule) => update({ handsOnModule })}
          />
          <TextRow
            label="Learning objectives"
            value={form.learningObjectives}
            disabled={saved}
            multiline
            onChange={(learningObjectives) => update({ learningObjectives })}
          />
          <TextRow
            label="Activities/tasks"
            value={form.activitiesTasks}
            disabled={saved}
            multiline
            onChange={(activitiesTasks) => update({ activitiesTasks })}
          />
          <TextRow
            label="Competencies to be developed"
            value={form.competencies}
            disabled={saved}
            multiline
            onChange={(competencies) => update({ competencies })}
          />
          <TextRow
            label="Assessment methods"
            value={form.assessmentMethods}
            disabled={saved}
            multiline
            onChange={(assessmentMethods) => update({ assessmentMethods })}
          />
          <TextRow
            label="Expected deliverables"
            value={form.expectedDeliverables}
            disabled={saved}
            multiline
            onChange={(expectedDeliverables) =>
              update({ expectedDeliverables })
            }
          />
          <TextRow
            label="Supervisor(s)"
            value={form.supervisors}
            disabled={saved}
            placeholder="Name / role / contact"
            multiline
            onChange={(supervisors) => update({ supervisors })}
          />
        </FormTable>

        <FormTable title="Agreement conditions">
          <ReadRow
            label="Financial support basis"
            value="SMECC2E mobility — travel, subsistence, insurance and participation costs as applicable"
          />
          <ChoiceRow label="Insurance proof verified">
            <RadioGroup
              name="internship-agreement-insurance"
              value={form.insuranceVerified}
              disabled={saved}
              onChange={(insuranceVerified) =>
                update({ insuranceVerified: insuranceVerified as YesNo })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Monitoring/evaluation method"
            value={form.monitoringMethod}
            disabled={saved}
            multiline
            onChange={(monitoringMethod) => update({ monitoringMethod })}
          />
          <ReadRow label="Certificate to be issued" value="Yes" />
          <TextRow
            label="Dispute/applicable-law contact"
            value={form.disputeContact}
            disabled={saved}
            onChange={(disputeContact) => update({ disputeContact })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Signed Internship Agreement"
              checked={form.agreementAttached}
              fileName={form.agreementFileName}
              disabled={saved}
              onCheckedChange={(agreementAttached) =>
                update({
                  agreementAttached,
                  agreementFileName: agreementAttached
                    ? form.agreementFileName
                    : "",
                })
              }
              onFileNameChange={(agreementFileName) =>
                update({ agreementAttached: true, agreementFileName })
              }
            />
            <AttachmentRow
              label="Internship Plan / Detailed activity schedule were used"
              checked={form.planAttached}
              fileName={form.planFileName}
              disabled={saved}
              onCheckedChange={(planAttached) =>
                update({
                  planAttached,
                  planFileName: planAttached ? form.planFileName : "",
                })
              }
              onFileNameChange={(planFileName) =>
                update({ planAttached: true, planFileName })
              }
            />
            <AttachmentRow
              label="Insurance proof"
              checked={form.insuranceAttached}
              fileName={form.insuranceFileName}
              disabled={saved}
              onCheckedChange={(insuranceAttached) =>
                update({
                  insuranceAttached,
                  insuranceFileName: insuranceAttached
                    ? form.insuranceFileName
                    : "",
                })
              }
              onFileNameChange={(insuranceFileName) =>
                update({ insuranceAttached: true, insuranceFileName })
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
              role: "Host Focal Person of Sending Institution",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Receiving Institution/Organisation",
              name: form.receivingName.trim() || "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Trainee",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "SMECC2E Coordinator",
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
            {
              role: "Host Focal Person",
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
            Internship agreement & plan signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign internship agreement & plan"}
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
