"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type YesNo = "" | "yes" | "no";
type YesNoNa = "" | "yes" | "no" | "na";
type OutstandingMatter = "" | "none" | "details";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type FormState = {
  cohort: Cohort;
  academicObligationsComplete: YesNo;
  transcriptCertificateStatus: YesNo;
  transcriptCertificateDate: string;
  libraryLabPropertyClearance: YesNoNa;
  financialAdminClearance: YesNoNa;
  departureConfirmed: YesNo;
  outstandingMatter: OutstandingMatter;
  outstandingMatterDetails: string;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  academicObligationsComplete: "",
  transcriptCertificateStatus: "",
  transcriptCertificateDate: "",
  libraryLabPropertyClearance: "",
  financialAdminClearance: "",
  departureConfirmed: "",
  outstandingMatter: "",
  outstandingMatterDetails: "",
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
  return `smecc2e.host-institution-final-clearance.${applicationId}`;
}

export function HostInstitutionFinalClearanceForm({
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

  const sign = () => {
    if (saved) return;
    if (!form.academicObligationsComplete) {
      setError("Indicate whether academic / training obligations are complete.");
      return;
    }
    if (!form.transcriptCertificateStatus) {
      setError(
        "Indicate whether the transcript / certificate is issued or scheduled."
      );
      return;
    }
    if (
      form.transcriptCertificateStatus === "yes" &&
      !form.transcriptCertificateDate
    ) {
      setError("Enter the transcript / certificate date.");
      return;
    }
    if (!form.libraryLabPropertyClearance) {
      setError("Indicate library / lab / property clearance status.");
      return;
    }
    if (!form.financialAdminClearance) {
      setError("Indicate financial / admin clearance status.");
      return;
    }
    if (!form.departureConfirmed) {
      setError("Indicate whether departure is confirmed.");
      return;
    }
    if (!form.outstandingMatter) {
      setError("Indicate whether there is an outstanding matter.");
      return;
    }
    if (
      form.outstandingMatter === "details" &&
      !form.outstandingMatterDetails.trim()
    ) {
      setError("Provide details of the outstanding matter.");
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
            Host institution final clearance form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Host Focal Person
          </p>
          <p className="mt-1 text-xs text-white/70">
            Source basis: Institutional Services and Support
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Confirm completion of host-side academic, administrative and welfare
          obligations. Host Focal Person sign-off remains Pending until
          completed by authorised staff.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="hifc-cohort"
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

        <FormTable title="Clearance">
          <ChoiceRow label="Academic / training obligations complete">
            <RadioGroup
              name="hifc-academic"
              value={form.academicObligationsComplete}
              disabled={saved}
              onChange={(academicObligationsComplete) =>
                update({
                  academicObligationsComplete:
                    academicObligationsComplete as YesNo,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Transcript / certificate issued or scheduled">
            <div className="space-y-2">
              <RadioGroup
                name="hifc-transcript"
                value={form.transcriptCertificateStatus}
                disabled={saved}
                onChange={(transcriptCertificateStatus) =>
                  update({
                    transcriptCertificateStatus:
                      transcriptCertificateStatus as YesNo,
                    transcriptCertificateDate:
                      transcriptCertificateStatus === "yes"
                        ? form.transcriptCertificateDate
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                ]}
              />
              {form.transcriptCertificateStatus === "yes" && (
                <input
                  type="date"
                  value={form.transcriptCertificateDate}
                  disabled={saved}
                  onChange={(event) =>
                    update({ transcriptCertificateDate: event.target.value })
                  }
                  className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <ChoiceRow label="Library / lab / property clearance">
            <RadioGroup
              name="hifc-library"
              value={form.libraryLabPropertyClearance}
              disabled={saved}
              onChange={(libraryLabPropertyClearance) =>
                update({
                  libraryLabPropertyClearance:
                    libraryLabPropertyClearance as YesNoNa,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Financial / admin clearance">
            <RadioGroup
              name="hifc-finance"
              value={form.financialAdminClearance}
              disabled={saved}
              onChange={(financialAdminClearance) =>
                update({
                  financialAdminClearance: financialAdminClearance as YesNoNa,
                })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Departure confirmed">
            <RadioGroup
              name="hifc-departure"
              value={form.departureConfirmed}
              disabled={saved}
              onChange={(departureConfirmed) =>
                update({ departureConfirmed: departureConfirmed as YesNo })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Outstanding matter">
            <div className="space-y-2">
              <RadioGroup
                name="hifc-outstanding"
                value={form.outstandingMatter}
                disabled={saved}
                onChange={(outstandingMatter) =>
                  update({
                    outstandingMatter: outstandingMatter as OutstandingMatter,
                    outstandingMatterDetails:
                      outstandingMatter === "details"
                        ? form.outstandingMatterDetails
                        : "",
                  })
                }
                options={[
                  ["none", "None"],
                  ["details", "Details"],
                ]}
              />
              {form.outstandingMatter === "details" && (
                <textarea
                  value={form.outstandingMatterDetails}
                  disabled={saved}
                  rows={3}
                  onChange={(event) =>
                    update({ outstandingMatterDetails: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
        </FormTable>

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
              role: "Host Focal Person",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <ViewedTable
          title="Viewed by"
          rows={[
            { role: "SMECC2E Coordinator", name: "Pending", date: "Pending" },
            { role: "Host Academic Supervisor", name: "Pending", date: "Pending" },
            { role: "Home Academic Supervisor", name: "Pending", date: "Pending" },
            {
              role: "Scholar",
              name: fullName,
              date: form.signedAt || "Awaiting acknowledgement",
            },
            { role: "Host Finance Officer", name: "Pending", date: "Pending" },
            {
              role: "Coordinator finance officer",
              name: "Pending",
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
            Clearance details acknowledged
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved
            ? "Clearance acknowledged"
            : "Acknowledge clearance details"}
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
