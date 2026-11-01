"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that I have read and understood this form. I voluntarily give consent to SMECC2E to use and publish only the photographs and details for which I have selected “Yes”, through the approved channels and subject to any restrictions stated above.";

const CONSENT_ITEMS = [
  ["portrait", "Portrait/profile photograph supplied by me"],
  [
    "events",
    "Photographs taken during SMECC2E meetings, training, academic, research, internship or project events",
  ],
  ["fullName", "Full name"],
  ["home", "Home institution / previous institution"],
  ["host", "Host institution / organisation"],
  ["mobility", "Mobility category and mobility type"],
  ["programme", "Programme/field of study or professional area"],
  ["topic", "Research, thesis, traineeship or internship topic/title"],
  ["achievements", "Project-related achievements, awards, outputs or milestones"],
  ["biography", "Approved quotation, testimonial or short biography"],
] as const;

const CHANNELS = [
  ["website", "SMECC2E website and Integrated Portal"],
  ["social", "Official SMECC2E social-media pages"],
  ["reports", "Project reports, newsletters, brochures, flyers, posters, factsheets and infographics"],
  ["events", "Presentations, workshops, conferences, exhibitions and project events"],
  ["partners", "Partner-university / host-organisation communication channels for SMECC2E activities"],
  [
    "euAu",
    "European Union / African Union / Intra-Africa Academic Mobility Scheme reporting and visibility materials",
  ],
  ["press", "Press releases and other SMECC2E-authorised public communication"],
] as const;

const PRIVACY = [
  [
    "relevant",
    "Only information relevant to SMECC2E visibility, reporting, dissemination and communication may be used under this consent.",
  ],
  [
    "sensitive",
    "Sensitive information such as passport details, residential address, banking information, medical information, passwords and confidential identifiers is not covered by this consent.",
  ],
  [
    "editing",
    "Photographs may be cropped, resized, captioned or combined with approved project branding, but must not be used in a misleading, defamatory or materially altered manner.",
  ],
  [
    "thirdParties",
    "Material published online may be viewed, downloaded, shared or archived by third parties outside the direct control of SMECC2E.",
  ],
  [
    "withdrawal",
    "I may withdraw consent for future use by written notice to the SMECC2E Project Management Team. Withdrawal applies prospectively and may not remove material already lawfully printed, distributed, archived, reported or republished before receipt of the withdrawal.",
  ],
  [
    "noEffect",
    "Refusal or withdrawal of consent will not affect my scholarship entitlement, academic standing, mobility participation or access to project support.",
  ],
] as const;

type ConsentId = (typeof CONSENT_ITEMS)[number][0];
type ChannelId = (typeof CHANNELS)[number][0];
type PrivacyId = (typeof PRIVACY)[number][0];
type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type YesNo = "" | "yes" | "no";

type ConsentChoice = { decision: YesNo; notes: string };

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  focalPerson: string;
  areaOfStudy: string;
};

type FormState = {
  cohort: Cohort;
  fieldProgramme: string;
  consent: Record<ConsentId, ConsentChoice>;
  channels: ChannelId[];
  privacy: Record<PrivacyId, boolean>;
  excludedPhotos: string;
  excludedDetails: string;
  excludedChannels: string;
  otherRestrictions: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function emptyConsent(): Record<ConsentId, ConsentChoice> {
  return Object.fromEntries(
    CONSENT_ITEMS.map(([id]) => [id, { decision: "", notes: "" }])
  ) as Record<ConsentId, ConsentChoice>;
}

function emptyPrivacy(): Record<PrivacyId, boolean> {
  return Object.fromEntries(PRIVACY.map(([id]) => [id, false])) as Record<PrivacyId, boolean>;
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  fieldProgramme: "",
  consent: emptyConsent(),
  channels: [],
  privacy: emptyPrivacy(),
  excludedPhotos: "",
  excludedDetails: "",
  excludedChannels: "",
  otherRestrictions: "",
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
  return `smecc2e.consent.${applicationId}`;
}

function fieldProgrammeFromUser(user: ApplicantSessionUser): string {
  return [user.application?.proposedAcademicProgramme, user.application?.thematicArea]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}

export function PhotoPublicationConsentForm({
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
    const defaults: FormState = {
      ...EMPTY_FORM,
      consent: emptyConsent(),
      privacy: emptyPrivacy(),
      fieldProgramme: fieldProgrammeFromUser(user),
    };
    try {
      const raw = localStorage.getItem(storageKey(applicationId));
      if (!raw) {
        setForm(defaults);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...defaults,
        ...parsed,
        consent: { ...emptyConsent(), ...parsed.consent },
        privacy: { ...emptyPrivacy(), ...parsed.privacy },
        channels: parsed.channels ?? [],
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm(defaults);
    }
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
              hostUniversity?: string;
              mobilityType?: string;
              mobilityStartDate?: string;
              mobilityEndDate?: string;
              areaOfStudy?: string;
            };
          };
        };
        if (cancelled || !data.letter) return;
        const areaOfStudy = data.letter.editable?.areaOfStudy ?? "";
        setLetter({
          host: data.letter.editable?.hostUniversity ?? "",
          mobilityType: data.letter.editable?.mobilityType ?? "",
          startDate: data.letter.editable?.mobilityStartDate ?? "",
          endDate: data.letter.editable?.mobilityEndDate ?? "",
          nationality: data.letter.auto?.nationality ?? "",
          focalPerson: data.letter.auto?.focalPersonName ?? "",
          areaOfStudy,
        });
        setForm((current) => {
          if (current.signedAt || !areaOfStudy.trim()) return current;
          const applicationDefault = fieldProgrammeFromUser(user);
          if (
            current.fieldProgramme.trim() &&
            current.fieldProgramme !== applicationDefault
          ) {
            return current;
          }
          return { ...current, fieldProgramme: areaOfStudy };
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
    setSaved(false);
    setError(null);
    setForm((current) => ({ ...current, ...patch, signature: "", signedAt: "" }));
  };

  const setConsent = (id: ConsentId, patch: Partial<ConsentChoice>) => {
    update({ consent: { ...form.consent, [id]: { ...form.consent[id], ...patch } } });
  };

  const toggleChannel = (id: ChannelId) => {
    update({
      channels: form.channels.includes(id)
        ? form.channels.filter((item) => item !== id)
        : [...form.channels, id],
    });
  };

  const sign = () => {
    const missing = CONSENT_ITEMS.find(([id]) => !form.consent[id]?.decision);
    if (missing) {
      setError(`Choose Yes or No for “${missing[1]}”.`);
      return;
    }
    const anyYes = CONSENT_ITEMS.some(([id]) => form.consent[id].decision === "yes");
    if (anyYes && form.channels.length === 0) {
      setError("Select at least one approved publication channel.");
      return;
    }
    if (PRIVACY.some(([id]) => !form.privacy[id])) {
      setError("Confirm each privacy, restriction, and withdrawal statement.");
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
      setError("The consent was signed in this session, but it could not be stored in this browser.");
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
          <p className="text-[11px] font-semibold leading-5 text-white/80">{GRANT_LINE}</p>
          <h1 className="mt-3 text-lg font-bold tracking-wide sm:text-xl">
            Photo & publication consent form
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Obtain and record the awardee&apos;s written, informed and specific consent for publication
          and use of approved photographs, biographical details and project-related information for
          SMECC2E visibility, reporting and dissemination.
        </p>
        <p className="text-sm font-semibold text-[#062763]">Primary user: Scholar</p>

        <FormTable title="Awardee identification">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="consent-cohort"
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
          <ReadRow label="Mobility category" value={mobilityCategory(mobilitySource)} />
          <ReadRow label="Mobility type" value={mobilityKind(mobilitySource)} />
          <ReadRow
            label="Home institution"
            value={pending(homeInstitution === "—" ? "" : homeInstitution)}
          />
          <ReadRow
            label="Host institution / organisation"
            value={pending(letter?.host || app?.preferredHostInstitution)}
          />
          <ReadRow label="Mobility start date" value={pending(letter?.startDate)} />
          <ReadRow label="Mobility end date" value={pending(letter?.endDate)} />
          <ReadRow label="Nationality" value={pending(letter?.nationality || app?.nationality)} />
          <ChoiceRow label="Field / programme / thematic area">
            <input
              type="text"
              value={form.fieldProgramme}
              onChange={(event) => update({ fieldProgramme: event.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
            />
          </ChoiceRow>
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Consent to publish photographs and details
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-3 py-2">Item</th>
                <th className="w-16 border border-slate-300 px-3 py-2">Yes</th>
                <th className="w-16 border border-slate-300 px-3 py-2">No</th>
                <th className="w-[34%] border border-slate-300 px-3 py-2">Notes / restrictions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700" colSpan={4}>
                  Please indicate your consent for each category. A “No” response will be respected
                  and will not affect scholarship entitlement or participation.
                </td>
              </tr>
              {CONSENT_ITEMS.map(([id, label]) => (
                <tr key={id}>
                  <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]">
                    {label}
                  </th>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    <input
                      type="radio"
                      name={`consent-${id}`}
                      checked={form.consent[id]?.decision === "yes"}
                      onChange={() => setConsent(id, { decision: "yes" })}
                      aria-label={`${label} yes`}
                    />
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    <input
                      type="radio"
                      name={`consent-${id}`}
                      checked={form.consent[id]?.decision === "no"}
                      onChange={() => setConsent(id, { decision: "no" })}
                      aria-label={`${label} no`}
                    />
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    <input
                      type="text"
                      value={form.consent[id]?.notes ?? ""}
                      onChange={(event) => setConsent(id, { notes: event.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Approved publication and communication channels
          </h2>
          <div className="mt-3 flex flex-col gap-2 px-1">
            {CHANNELS.map(([id, label]) => (
              <label key={id} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={form.channels.includes(id)}
                  onChange={() => toggleChannel(id)}
                  className="mt-1"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Privacy, restrictions and withdrawal
          </h2>
          <div className="mt-3 flex flex-col gap-2 px-1">
            {PRIVACY.map(([id, label]) => (
              <label key={id} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={form.privacy[id]}
                  onChange={(event) =>
                    update({ privacy: { ...form.privacy, [id]: event.target.checked } })
                  }
                  className="mt-1"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <FormTable title="Specific restrictions / instructions">
          <TextRow
            label="Any photograph(s) that must not be used"
            value={form.excludedPhotos}
            placeholder="Text / identify file or event"
            onChange={(excludedPhotos) => update({ excludedPhotos })}
          />
          <TextRow
            label="Any detail(s) that must not be published"
            value={form.excludedDetails}
            onChange={(excludedDetails) => update({ excludedDetails })}
          />
          <TextRow
            label="Any channel(s) excluded from consent"
            value={form.excludedChannels}
            onChange={(excludedChannels) => update({ excludedChannels })}
          />
          <TextRow
            label="Other restrictions / conditions"
            value={form.otherRestrictions}
            onChange={(otherRestrictions) => update({ otherRestrictions })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Awardee declaration and sign-off
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
          title="Awardee declaration and sign-off"
          rows={[
            {
              role: "Awardee / scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />
        <SignTable
          title="Viewable by"
          rows={[
            {
              role: "Host focal person",
              name: pending(letter?.focalPerson),
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Project coordinator",
              name: "SMECC2E project coordinator",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Quality assurance officer",
              name: "Quality assurance officer",
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
            Consent signed{form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580]"
        >
          Sign consent
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <tr>
      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
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
