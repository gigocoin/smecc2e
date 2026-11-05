"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";
import type { ScholarshipAcceptanceFormData } from "@/lib/scholarship-acceptance-shared";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the information provided is complete and that any additional funding received before or during the scholarship period will be declared to the SMECC2E Project Management Team.";

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
            <tr key={row.role}>
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

/** Read-only scholarship acceptance form matching the scholar-facing layout. */
export function ScholarshipAcceptanceDocument({
  app,
  form,
}: {
  app: ApplicationRecord;
  form: ScholarshipAcceptanceFormData;
}) {
  const fullName = applicantDisplayName(app) || form.signature || "—";
  const mobilitySource = app.nomineeMobilityType || app.typeOfMobility || "";
  const homeInstitution = applicantHomeInstitution({
    masterProgrammeUniversity: app.masterProgrammeUniversity,
    bachelorProgrammeUniversity: app.bachelorProgrammeUniversity,
  });

  return (
    <article
      data-scholarship-acceptance-document
      className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
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
            Scholarship acceptance & funding declaration form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Record acceptance or rejection of the nomination and declarations
          affecting scholarship eligibility.
        </p>

        <FormTable title="Linked award record">
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

        <FormTable title="Acceptance & eligibility">
          <ChoiceDisplay
            label="Decision"
            value={form.decision}
            options={[
              ["accept", "Accept nomination"],
              ["reject", "Reject nomination"],
            ]}
          />
          <ReadRow
            label="Acceptance / rejection date"
            value={pending(form.decisionDate)}
          />
          <tr>
            <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
              Application information still accurate
            </th>
            <td className="border border-slate-300 px-3 py-2">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(
                    [
                      ["yes", "Yes"],
                      ["no", "No"],
                    ] as const
                  ).map(([optionValue, optionLabel]) => (
                    <label
                      key={optionValue}
                      className="inline-flex items-center gap-2 text-sm text-slate-800"
                    >
                      <input
                        type="radio"
                        checked={form.accurate === optionValue}
                        readOnly
                        disabled
                      />
                      {optionLabel}
                    </label>
                  ))}
                </div>
                {form.accurate === "no" && form.accurateNote ? (
                  <p className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-[#062763]">
                    {form.accurateNote}
                  </p>
                ) : null}
              </div>
            </td>
          </tr>
          <ChoiceDisplay
            label="Other EU-funded scholarship for the same costs / period"
            value={form.otherEu}
            options={[
              ["yes", "Yes"],
              ["no", "No"],
            ]}
          />
          <ChoiceDisplay
            label="Other financial award for the same costs / period"
            value={form.otherAward}
            options={[
              ["yes", "Yes"],
              ["no", "No"],
            ]}
          />
          <ReadRow
            label="Additional funding details"
            value={
              form.fundingDetails.trim()
                ? form.fundingDetails
                : "—"
            }
          />
          <ChoiceDisplay
            label="Conflict / overlap assessment"
            value={form.overlap}
            options={[
              ["none", "None"],
              ["potential", "Potential overlap"],
              ["confirmed", "Confirmed overlap"],
            ]}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <label className="mt-3 flex items-start gap-3 px-1 text-sm leading-6 text-slate-700">
            <input type="checkbox" checked={form.evidenceAttached} readOnly disabled className="mt-1" />
            <span>
              Evidence relating to other funding or a prior award, where
              applicable
              {form.evidenceFileName ? (
                <span className="mt-1 block font-semibold text-[#062763]">
                  {form.evidenceFileName}
                </span>
              ) : null}
            </span>
          </label>
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
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Host focal person",
              name: pending(app.nomineeFocalPerson),
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <SignTable
          title="Received by"
          rows={[
            {
              role: "SMECC2E coordinator",
              name: "SMECC2E coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Declaration signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
        </p>
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
