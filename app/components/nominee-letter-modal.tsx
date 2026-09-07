"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  NOMINEE_TARGET_GROUP_OPTIONS,
  PRIVACY_STATEMENT_URL,
  PROJECT_COORDINATOR_SIGNATURE,
  SMECC2E_PROJECT_EMAIL,
  type NomineeLetterAutoFields,
  type NomineeLetterEditableFields,
} from "@/lib/nominee-letter-shared";

export type NomineeLetterData = {
  auto: NomineeLetterAutoFields;
  editable: NomineeLetterEditableFields;
  applicantEmail: string;
  applicantName: string;
};

/** Read-only value merged in from the database. */
function AutoValue({
  value,
  missingLabel = "—",
}: {
  value: string;
  missingLabel?: string;
}) {
  const text = value?.trim();
  if (!text) {
    return (
      <span className="rounded bg-red-50 px-1 font-semibold text-red-700">
        {missingLabel}
      </span>
    );
  }
  return (
    <span
      className="rounded bg-amber-100 px-1 font-semibold text-slate-900"
      title="Filled from the database"
    >
      {text}
    </span>
  );
}

function EditableInput({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  width = "12rem",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  width?: string;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{ width }}
        className="rounded border-2 border-sky-400 bg-sky-50 px-2 py-0.5 align-baseline text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
      />
    </>
  );
}

const letterParagraphClass = "text-sm leading-7 text-slate-800";
const detailLabelClass = "text-sm font-bold text-slate-900";

export function NomineeLetterModal({
  applicationId,
  applicantName,
  onClose,
  onSent,
}: {
  applicationId: string;
  applicantName: string;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [letter, setLetter] = useState<NomineeLetterData | null>(null);
  const [fields, setFields] = useState<NomineeLetterEditableFields | null>(
    null
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/applications/${encodeURIComponent(applicationId)}/nominee-letter`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as {
          letter?: NomineeLetterData;
          error?: string;
        };
        if (!active) return;
        if (!res.ok || !data.letter) {
          setLoadError(data.error ?? "Could not load the nomination letter.");
          return;
        }
        setLetter(data.letter);
        setFields(data.letter.editable);
      } catch {
        if (active) setLoadError("Could not load the nomination letter.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [applicationId]);

  const updateField = (
    key: keyof NomineeLetterEditableFields,
    value: string
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSendError(null);
  };

  const handleSend = async () => {
    if (!fields) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/nominee-letter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        }
      );
      const data = (await res.json()) as {
        error?: string;
        warning?: string;
        email?: string;
      };
      if (!res.ok) {
        setSendError(data.error ?? "Could not send the nomination letter.");
        return;
      }
      const email = data.email ?? letter?.applicantEmail ?? "the applicant";
      onSent(
        data.warning
          ? `Nomination letter prepared for ${email}. ${data.warning}`
          : `Nomination letter sent to ${email}.`
      );
    } catch {
      setSendError("Could not send the nomination letter.");
    } finally {
      setSending(false);
    }
  };

  const auto = letter?.auto;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nominee-letter-title"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="nominee-letter-title"
              className="text-base font-bold text-[#062763]"
            >
              Nomination Letter
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              {applicantName || applicationId} ·{" "}
              <span className="rounded bg-amber-100 px-1">amber</span> values
              come from the database,{" "}
              <span className="rounded border border-sky-400 bg-sky-50 px-1 text-[#062763]">
                blue
              </span>{" "}
              fields are editable.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border-2 border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
          {loading && (
            <p className="text-sm font-semibold text-slate-800">
              Loading nomination letter…
            </p>
          )}

          {loadError && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {loadError}
            </p>
          )}

          {auto && !auto.focalPersonName.trim() && (
            <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              No focal person is set for{" "}
              {letter?.editable.hostUniversity || "this host institution"}. Open
              Users, edit a member of that institution, and tick
              &ldquo;Institution&apos;s focal person&rdquo; to fill the contact
              person, e-mail, and address.
            </p>
          )}

          {auto && fields && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-200 pb-4">
                <Image
                  src="/images/letter-header.jpg"
                  alt="SMECC2E Cross Regional Intra-Africa Mobility Project, African Union, Co-funded by the European Union"
                  width={1024}
                  height={157}
                  priority
                  className="h-auto w-full"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                <p>
                  Our Ref: SMECC2E/<AutoValue value={auto.applicantNo} />
                </p>
                <p>
                  Date: <AutoValue value={auto.letterDate} />
                </p>
              </div>

              <h3 className="text-center text-base font-bold text-slate-900">
                Nomination Letter
              </h3>

              <p className={letterParagraphClass}>
                Dear <AutoValue value={auto.firstName} />{" "}
                <AutoValue value={auto.surname} />,
              </p>

              <p className={letterParagraphClass}>
                We are pleased to inform you that your application (
                <AutoValue value={auto.applicantNo} />) for the Intra-Africa –
                Mobility in Sustainable Energy &amp; Materials, Energy Policy,
                Climate Change, Energy Economics and Environment (SMECC2E)
                Scholarship was successful and you were selected for a stay at
                the{" "}
                <EditableInput
                  id="nominee-host-university"
                  label="Host university"
                  value={fields.hostUniversity}
                  onChange={(value) => updateField("hostUniversity", value)}
                  disabled={sending}
                  placeholder="Host university"
                  width="18rem"
                />
                . The details of the scholarship are as follows:
              </p>

              <div className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:gap-x-4">
                <p className={detailLabelClass}>Programme:</p>
                <p className="text-sm text-slate-800">
                  Intra-Africa Academic Mobility Scheme
                </p>

                <p className={detailLabelClass}>Title of the EU Project:</p>
                <p className="text-sm text-slate-800">
                  Sustainable Energy &amp; Materials, Energy Policy, Climate
                  Change, Energy Economics and Environment (SMECC2E)
                </p>

                <p className={detailLabelClass}>Host University:</p>
                <p className="text-sm text-slate-800">
                  <EditableInput
                    id="nominee-host-university-detail"
                    label="Host university (details)"
                    value={fields.hostUniversity}
                    onChange={(value) => updateField("hostUniversity", value)}
                    disabled={sending}
                    placeholder="Host university"
                    width="18rem"
                  />
                </p>

                <p className={detailLabelClass}>
                  Host University Contact Person:
                </p>
                <p className="text-sm text-slate-800">
                  <AutoValue
                    value={auto.focalPersonName}
                    missingLabel="No focal person set for this institution"
                  />
                </p>

                <p className={detailLabelClass}>Contact e-mail:</p>
                <p className="text-sm text-slate-800">
                  <AutoValue
                    value={auto.focalPersonEmail}
                    missingLabel="No focal person e-mail"
                  />
                </p>

                <p className={detailLabelClass}>Contact address:</p>
                <p className="text-sm text-slate-800">
                  <AutoValue
                    value={auto.focalPersonAddress}
                    missingLabel="No address on the focal person's profile"
                  />
                </p>

                <p className={detailLabelClass}>Type of Mobility:</p>
                <p className="text-sm text-slate-800">
                  <EditableInput
                    id="nominee-mobility-type"
                    label="Type of mobility"
                    value={fields.mobilityType}
                    onChange={(value) => updateField("mobilityType", value)}
                    disabled={sending}
                    placeholder="Type of mobility"
                    width="18rem"
                  />
                </p>

                <p className={detailLabelClass}>Area of study/work:</p>
                <p className="text-sm text-slate-800">
                  <EditableInput
                    id="nominee-area-of-study"
                    label="Area of study or work"
                    value={fields.areaOfStudy}
                    onChange={(value) => updateField("areaOfStudy", value)}
                    disabled={sending}
                    placeholder="Proposed programme"
                    width="18rem"
                  />
                </p>

                <p className={detailLabelClass}>Maximum duration:</p>
                <p className="text-sm text-slate-800">
                  <EditableInput
                    id="nominee-duration"
                    label="Maximum duration in months"
                    value={fields.durationMonths}
                    onChange={(value) => updateField("durationMonths", value)}
                    disabled={sending}
                    placeholder="e.g. 24"
                    width="6rem"
                  />{" "}
                  months
                </p>

                <p className={detailLabelClass}>
                  Target group (students only):
                </p>
                <p className="text-sm text-slate-800">
                  <label className="sr-only" htmlFor="nominee-target-group">
                    Target group
                  </label>
                  <select
                    id="nominee-target-group"
                    value={fields.targetGroup}
                    onChange={(e) => updateField("targetGroup", e.target.value)}
                    disabled={sending}
                    className="rounded border-2 border-sky-400 bg-sky-50 px-2 py-0.5 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Select target group
                    </option>
                    {NOMINEE_TARGET_GROUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </p>
              </div>

              <p className={letterParagraphClass}>
                The scholarship covers a monthly subsistence allowance as well
                as full insurance coverage (accident, travel, health) for the
                duration of the scholarship.
              </p>

              <p className={letterParagraphClass}>
                The travel costs will also be recovered in line with the
                conditions set in the scholarship agreement.
              </p>

              <p className={letterParagraphClass}>
                The full details of the scholarship are provided in the enclosed
                scholarship agreement.
              </p>

              <p className={letterParagraphClass}>
                You will need to establish your place of stay at the location of
                the Host University. The welcome and housing services of the
                Host University will assist you to find suitable accommodation.
              </p>

              <p className={letterParagraphClass}>
                If you accept the scholarship and agree with the terms of the
                enclosed scholarship agreement on the SMECC2E Portal (please
                login to the SMECC2E application portal to view the draft
                agreement), sign it digitally and submit on the portal. Download
                a copy of the signed agreement and send back to the Host
                University at <AutoValue value={auto.focalPersonName} /> (
                <AutoValue value={auto.focalPersonEmail} />) and a copy to us at{" "}
                {SMECC2E_PROJECT_EMAIL} on or before{" "}
                <AutoValue value={auto.responseDeadline} />, so that we can
                start taking the practical arrangements for your mobility.
                Failure to sign and submit the scholarship agreement within the
                stipulated period means that you have decided to forfeit/reject
                the nomination.
              </p>

              <p className={letterParagraphClass}>
                The European Education and Culture Executive Agency (EACEA), in
                the context of managing the Intra-Africa Academic Mobility
                Scheme, collects and processes the personal data of some of the
                candidates. In particular, certain data of the scholarship
                holders is shared with the Agency through the mobility tool
                under EU Funding and Tenders Portal and treated according to the
                following{" "}
                <a
                  href={PRIVACY_STATEMENT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 underline"
                >
                  privacy statement
                </a>
                .
              </p>

              <p className={letterParagraphClass}>
                We wish you a successful stay at{" "}
                <EditableInput
                  id="nominee-host-university-closing"
                  label="Host university (closing)"
                  value={fields.hostUniversity}
                  onChange={(value) => updateField("hostUniversity", value)}
                  disabled={sending}
                  placeholder="Host university"
                  width="18rem"
                />
                , in <AutoValue value={auto.hostCountry} />.
              </p>

              <div className="pt-2 text-sm leading-6 text-slate-800">
                <p>Yours sincerely,</p>
                <div className="mt-4 space-y-0.5 font-semibold">
                  {PROJECT_COORDINATOR_SIGNATURE.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 text-left">
                <Image
                  src="/images/letter-footer.png"
                  alt="Implemented by the SMECC2E partner universities — https://smecc2e.unn.edu.ng/"
                  width={590}
                  height={159}
                  className="h-auto w-full max-w-147.5"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          {sendError && (
            <p
              className="mb-3 text-sm font-semibold text-red-700"
              role="alert"
            >
              {sendError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-700">
              {letter?.applicantEmail
                ? `Sends to ${letter.applicantEmail}, copying coordinators and the host focal person.`
                : "Sends to the applicant, copying coordinators."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || loading || !fields}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send letter"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
