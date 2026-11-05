"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  applicantDisplayName,
  type ApplicationRecord,
} from "@/lib/application-types";
import type { PersonalContactFormData } from "@/lib/personal-contact-shared";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the updated information is accurate and authorise its use for administration of my SMECC2E mobility.";

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

/** Read-only personal & contact update form matching the scholar-facing layout. */
export function PersonalContactDocument({
  app,
  form,
}: {
  app: ApplicationRecord;
  form: PersonalContactFormData;
}) {
  const fullName = applicantDisplayName(app) || form.signature || "—";
  const mobilitySource = app.nomineeMobilityType || app.typeOfMobility || "";

  return (
    <article
      data-personal-contact-document
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
            Personal & contact information update form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Maintain current identity, communication and emergency-contact details.
        </p>

        <FormTable title="Participant record">
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
          <ReadRow
            label="Mobility start date"
            value={pending(app.nomineeStartDate)}
          />
          <ReadRow
            label="Mobility end date"
            value={pending(app.nomineeEndDate)}
          />
        </FormTable>

        <FormTable title="Contact details">
          <ReadRow label="Primary email" value={pending(form.primaryEmail)} />
          <ReadRow
            label="Alternative email"
            value={pending(form.alternativeEmail)}
          />
          <ReadRow label="Mobile/WhatsApp" value={pending(form.mobile)} />
          <ReadRow
            label="Current residential address in home country"
            value={pending(form.address)}
          />
          <ReadRow
            label="Emergency (next of kin) contact name"
            value={pending(form.emergencyName)}
          />
          <ReadRow label="Relationship" value={pending(form.relationship)} />
          <ReadRow
            label="Emergency contact phone/email"
            value={pending(form.emergencyContact)}
          />
          <ReadRow
            label="Passport number / expiry"
            value={pending(form.passport)}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            Supporting identity/address evidence only when requested:{" "}
            <span className="font-semibold text-[#062763]">
              {form.evidenceAttached
                ? form.evidenceFileName || "Attached"
                : "Not attached"}
            </span>
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
              name: pending(app.nomineeFocalPerson),
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewable by"
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
