"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";
import {
  MOBILITY_THEMATIC_AREAS,
  type MobilityDetailsFormData,
} from "@/lib/mobility-details-shared";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "The parties confirm that the displayed mobility details correspond to the approved award unless an amendment is formally approved.";

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

function FormTable({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-visible">
      <table className="w-full border-collapse text-sm">
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
      <th className="break-words border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
        {label}
      </th>
      <td className="break-words border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
        {value}
      </td>
    </tr>
  );
}

function ChoiceDisplay({
  label,
  options,
  value,
}: {
  label: string;
  options: [string, string][];
  value: string;
}) {
  return (
    <tr>
      <th className="break-words border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
        {label}
      </th>
      <td className="break-words border border-slate-300 px-3 py-2">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {options.map(([optionValue, optionLabel]) => (
            <label
              key={optionValue}
              className="inline-flex items-center gap-2 text-sm text-slate-800"
            >
              <input
                type="radio"
                checked={value === optionValue}
                readOnly
                disabled
              />
              {optionLabel}
            </label>
          ))}
        </div>
      </td>
    </tr>
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
    <section className="overflow-visible">
      <table className="w-full border-collapse text-sm">
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

/** Read-only mobility details confirmation matching the scholar-facing layout. */
export function MobilityDetailsDocument({
  app,
  form,
}: {
  app: ApplicationRecord;
  form: MobilityDetailsFormData;
}) {
  const fullName = applicantDisplayName(app) || form.signature || "—";
  const mobilitySource = app.nomineeMobilityType || app.typeOfMobility || "";
  const homeInstitution = applicantHomeInstitution({
    masterProgrammeUniversity: app.masterProgrammeUniversity,
    bachelorProgrammeUniversity: app.bachelorProgrammeUniversity,
  });

  return (
    <article
      data-mobility-details-document
      className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header>
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <Image
            src="/images/letter-header.jpg"
            alt="SMECC2E Cross Regional Intra-Africa Mobility Project, African Union, Co-funded by the European Union"
            width={1024}
            height={157}
            className="h-auto w-full"
          />
        </div>
        <div className="bg-[#062763] px-6 py-5 text-white">
          <p className="text-[11px] font-semibold leading-5 text-white/80">
            {GRANT_LINE}
          </p>
          <h1 className="mt-3 text-lg font-bold tracking-wide sm:text-xl">
            Mobility details confirmation form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Confirm the approved mobility configuration before pre-departure
          processing.
        </p>

        <FormTable title="Mobility record">
          <ChoiceDisplay
            label="Mobility cohort"
            value={form.cohort}
            options={[
              ["cohort-1", "Cohort 1"],
              ["cohort-2", "Cohort 2"],
              ["cohort-3", "Cohort 3"],
            ]}
          />
          <ReadRow label="Applicant / scholar ID" value={pending(app.id)} />
          <ReadRow label="Full names" value={fullName} />
          <ReadRow label="Gender" value={pending(app.gender)} />
          <ReadRow label="Nationality" value={pending(app.nationality)} />
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
            value={pending(
              app.nomineeHostUniversity || app.preferredHostInstitution
            )}
          />
          <ReadRow
            label="Mobility start date"
            value={pending(app.nomineeStartDate)}
          />
          <ReadRow
            label="Mobility end date"
            value={pending(app.nomineeEndDate)}
          />
        </FormTable>

        <FormTable title="Confirmed details">
          <ReadRow
            label="Programme / field of education"
            value={pending(form.programme)}
          />
          <tr>
            <th className="break-words border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
              Thematic area
            </th>
            <td className="break-words border border-slate-300 px-3 py-2">
              <div className="flex flex-col gap-2">
                {MOBILITY_THEMATIC_AREAS.map((area) => (
                  <label
                    key={area}
                    className="inline-flex items-center gap-2 text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={form.thematicAreas.includes(area)}
                      readOnly
                      disabled
                    />
                    {area}
                  </label>
                ))}
              </div>
            </td>
          </tr>
          <ReadRow
            label="Faculty/department/unit"
            value={pending(form.faculty)}
          />
          <ReadRow
            label="Host contact/focal person"
            value={[form.hostName, form.hostEmail, form.hostPhone]
              .map((part) => part.trim())
              .filter(Boolean)
              .join(" · ") || "Pending"}
          />
          <ChoiceDisplay
            label="Academic supervisor / mentor status"
            value={form.supervisorStatus}
            options={[
              ["assigned", "Assigned"],
              ["pending", "Pending"],
            ]}
          />
          <ReadRow
            label="Expected qualification or mobility output"
            value={pending(form.expectedOutput)}
          />
          <ChoiceDisplay
            label="Any discrepancy from award record"
            value={form.discrepancy}
            options={[
              ["yes", "Yes"],
              ["no", "No"],
            ]}
          />
          {form.discrepancy === "yes" && (
            <ReadRow
              label="Discrepancy details"
              value={pending(form.discrepancyDetails)}
            />
          )}
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

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Declaration / commitment
          </h2>
          <label className="mt-3 flex items-start gap-3 px-1 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={form.declared}
              readOnly
              disabled
              className="mt-1"
            />
            <span>{DECLARATION}</span>
          </label>
        </section>

        <SignTable
          title="Sign"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature,
              date: form.signedAt,
            },
          ]}
        />
        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Host focal person",
              name: pending(form.hostName || app.nomineeFocalPerson),
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "SMECC2E coordinator",
              name: "SMECC2E coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
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
