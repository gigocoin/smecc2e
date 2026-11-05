"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the updated information is accurate and authorise its use for administration of my SMECC2E mobility.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";

type LetterFields = {
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  focalPerson: string;
};

type FormState = {
  cohort: Cohort;
  primaryEmail: string;
  alternativeEmail: string;
  mobile: string;
  address: string;
  emergencyName: string;
  relationship: string;
  emergencyContact: string;
  passport: string;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  primaryEmail: "",
  alternativeEmail: "",
  mobile: "",
  address: "",
  emergencyName: "",
  relationship: "",
  emergencyContact: "",
  passport: "",
  evidenceAttached: false,
  evidenceFileName: "",
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

function storageKey(applicationId: string): string {
  return `smecc2e.contact.${applicationId}`;
}

function emergencyContact(phone: string, email: string): string {
  return [phone, email].map((part) => part.trim()).filter(Boolean).join(" · ");
}

function defaultsFromUser(user: ApplicantSessionUser): FormState {
  const app = user.application;
  const personal = app?.personalEmail?.trim() ?? "";
  const primary = user.email.trim();
  return {
    ...EMPTY_FORM,
    primaryEmail: primary,
    alternativeEmail: personal && personal.toLowerCase() !== primary.toLowerCase() ? personal : "",
    mobile: app?.phoneNumber?.trim() ?? "",
    address: app?.homeAddress?.trim() ?? "",
    emergencyName: app?.nextOfKinName?.trim() ?? "",
    relationship: app?.nextOfKinRelationship?.trim() ?? "",
    emergencyContact: emergencyContact(app?.nextOfKinWhatsapp ?? "", app?.nextOfKinEmail ?? ""),
    passport: app?.passportOrIdNumber?.trim() ?? "",
  };
}

export function PersonalContactUpdateForm({
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const defaults = defaultsFromUser(user);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/personal-contact");
        if (res.ok) {
          const data = (await res.json()) as {
            form?: Partial<FormState> | null;
            submitted?: boolean;
          };
          if (!cancelled && data.form) {
            setForm({ ...defaults, ...data.form });
            if (data.submitted || data.form.signedAt) setSaved(true);
            return;
          }
        }
      } catch {
        // Fall back to any local draft below.
      }
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(storageKey(applicationId));
        if (!raw) {
          setForm(defaults);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<FormState>;
        setForm({ ...defaults, ...parsed });
        if (parsed.signedAt) setSaved(true);
      } catch {
        setForm(defaults);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/applicant/nominee-letter");
        if (!res.ok) return;
        const data = (await res.json()) as {
          letter?: {
            auto?: { nationality?: string; focalPersonName?: string };
            editable?: {
              mobilityType?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
            };
          };
        };
        if (cancelled || !data.letter) return;
        setLetter({
          mobilityType: data.letter.editable?.mobilityType ?? "",
          startDate: data.letter.editable?.mobilityStartDate ?? "",
          endDate: data.letter.editable?.mobilityEndDate ?? "",
          nationality: data.letter.auto?.nationality ?? "",
          focalPerson: data.letter.auto?.focalPersonName ?? "",
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

  const update = (patch: Partial<FormState>) => {
    if (saved || submitting) return;
    setError(null);
    setForm((current) => ({ ...current, ...patch, signature: "", signedAt: "" }));
  };

  const sign = () => {
    if (saved || submitting) return;
    if (!form.primaryEmail.trim()) {
      setError("Enter a primary email.");
      return;
    }
    if (!form.mobile.trim()) {
      setError("Enter a mobile or WhatsApp number.");
      return;
    }
    if (!form.address.trim()) {
      setError("Enter your current residential address in your home country.");
      return;
    }
    if (!form.emergencyName.trim() || !form.relationship.trim() || !form.emergencyContact.trim()) {
      setError("Enter the emergency contact name, relationship, and phone or email.");
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
    setSubmitting(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/applicant/personal-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: next }),
        });
        const data = (await res.json()) as {
          form?: FormState;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Could not submit the contact update.");
          return;
        }
        const submitted = data.form ? { ...EMPTY_FORM, ...data.form } : next;
        setForm(submitted);
        setSaved(true);
        try {
          localStorage.setItem(storageKey(applicationId), JSON.stringify(submitted));
        } catch {
          // Server save succeeded; local draft is optional.
        }
      } catch {
        setError("Could not submit the contact update.");
      } finally {
        setSubmitting(false);
      }
    })();
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
          <p className="text-[11px] font-semibold leading-5 text-white/80">{GRANT_LINE}</p>
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
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="contact-cohort"
              value={form.cohort}
              onChange={(cohort) => update({ cohort: cohort as Cohort })}
              options={[
                ["cohort-1", "Cohort 1"],
                ["cohort-2", "Cohort 2"],
                ["cohort-3", "Cohort 3"],
              ]}
            />
          </ChoiceRow>
          <ReadRow label="Applicant / scholar ID" value={pending(app?.publicId || app?.id)} />
          <ReadRow label="Full names" value={fullName} />
          <ReadRow label="Nationality" value={pending(letter?.nationality || app?.nationality)} />
          <ReadRow label="Mobility category" value={mobilityCategory(mobilitySource)} />
          <ReadRow label="Mobility start date" value={pending(letter?.startDate)} />
          <ReadRow label="Mobility end date" value={pending(letter?.endDate)} />
        </FormTable>

        <FormTable title="Contact details">
          <TextRow
            label="Primary email"
            value={form.primaryEmail}
            type="email"
            onChange={(primaryEmail) => update({ primaryEmail })}
          />
          <TextRow
            label="Alternative email"
            value={form.alternativeEmail}
            type="email"
            onChange={(alternativeEmail) => update({ alternativeEmail })}
          />
          <TextRow
            label="Mobile/WhatsApp"
            value={form.mobile}
            onChange={(mobile) => update({ mobile })}
          />
          <TextRow
            label="Current residential address in home country"
            value={form.address}
            multiline
            onChange={(address) => update({ address })}
          />
          <TextRow
            label="Emergency (next of kin) contact name"
            value={form.emergencyName}
            onChange={(emergencyName) => update({ emergencyName })}
          />
          <TextRow
            label="Relationship"
            value={form.relationship}
            onChange={(relationship) => update({ relationship })}
          />
          <TextRow
            label="Emergency contact phone/email"
            value={form.emergencyContact}
            onChange={(emergencyContact) => update({ emergencyContact })}
          />
          <TextRow
            label="Passport number / expiry"
            value={form.passport}
            placeholder="Where required for mobility administration"
            onChange={(passport) => update({ passport })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <label className="mt-3 flex items-start gap-3 px-1 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={form.evidenceAttached}
              onChange={(event) =>
                update({
                  evidenceAttached: event.target.checked,
                  evidenceFileName: event.target.checked ? form.evidenceFileName : "",
                })
              }
              className="mt-1"
            />
            <span>
              Supporting identity/address evidence only when requested
              {form.evidenceAttached && (
                <input
                  type="file"
                  className="mt-2 block w-full text-sm"
                  onChange={(event) =>
                    update({
                      evidenceFileName: event.target.files?.[0]?.name ?? "",
                      evidenceAttached: true,
                    })
                  }
                />
              )}
              {form.evidenceFileName && (
                <span className="mt-1 block font-semibold text-[#062763]">{form.evidenceFileName}</span>
              )}
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
              onChange={(event) => update({ declared: event.target.checked })}
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
              name: pending(letter?.focalPerson),
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

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
            Contact details signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved || submitting}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : saved ? "Update signed" : "Sign update"}
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
            <th className="w-[42%] border border-slate-300 px-3 py-2">Field / item</th>
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
      <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">{value}</td>
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
  type = "text",
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  multiline?: boolean;
  placeholder?: string;
}) {
  const className = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]";
  return (
    <tr>
      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2">
        {multiline ? (
          <textarea
            value={value}
            rows={3}
            onChange={(event) => onChange(event.target.value)}
            className={className}
          />
        ) : (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={className}
          />
        )}
      </td>
    </tr>
  );
}

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map(([optionValue, label]) => (
        <label key={optionValue} className="inline-flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={value === optionValue}
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
            <th className="border border-slate-300 px-3 py-2">Decision / signature</th>
            <th className="border border-slate-300 px-3 py-2">Date / timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.role}`}>
              <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
                {row.role}
              </th>
              <td className="border border-slate-300 px-3 py-2">{row.name}</td>
              <td className="border border-slate-300 px-3 py-2">{row.signature}</td>
              <td className="border border-slate-300 px-3 py-2">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
