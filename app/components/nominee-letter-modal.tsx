"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  NOMINEE_LETTER_PENDING,
  NOMINEE_TARGET_GROUP_OPTIONS,
  PRIVACY_STATEMENT_URL,
  PROJECT_COORDINATOR_SIGNATURE,
  SMECC2E_PROJECT_EMAIL,
  SMECC2E_PORTAL_URL,
  nomineeLetterDatesFromInput,
  type NomineeLetterAutoFields,
  type NomineeLetterEditableFields,
} from "@/lib/nominee-letter-shared";
import {
  AutoValue,
  EditableInput,
  EditableSelect,
  EmailLink,
  detailLabelClass,
  letterParagraphClass,
} from "./nominee-letter-fields";
import { NomineeLetterPage } from "./nominee-letter-page";
import {
  NOMINEE_DOCUMENT_TOTAL_PAGES,
  NomineeScholarshipAgreement,
} from "./nominee-scholarship-agreement";

export type NomineeLetterMode = "share" | "send" | "sign";

export type NomineeLetterData = {
  auto: NomineeLetterAutoFields;
  editable: NomineeLetterEditableFields;
  applicantEmail: string;
  applicantName: string;
  shared: boolean;
  sent: boolean;
};

export function NomineeLetterModal({
  applicationId,
  applicantName,
  mode = "share",
  startEditing = false,
  onClose,
  onSent,
  onDraftShared,
  onSigned,
}: {
  applicationId: string;
  applicantName: string;
  mode?: NomineeLetterMode;
  startEditing?: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
  onDraftShared?: (message: string) => void;
  onSigned?: (message: string) => void;
}) {
  const isSendMode = mode === "send";
  const isSignMode = mode === "sign";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [letter, setLetter] = useState<NomineeLetterData | null>(null);
  const [fields, setFields] = useState<NomineeLetterEditableFields | null>(
    null
  );
  const [letterDateInput, setLetterDateInput] = useState("");
  const [editing, setEditing] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [persistedNomineeSigned, setPersistedNomineeSigned] = useState(false);
  const [persistedHostSigned, setPersistedHostSigned] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setShareSuccess(null);
      try {
        const endpoint = isSignMode
          ? "/api/applicant/nominee-letter"
          : `/api/applications/${encodeURIComponent(applicationId)}/nominee-letter`;
        const res = await fetch(endpoint, { cache: "no-store" });
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
        setPersistedNomineeSigned(
          Boolean(
            data.letter.editable.scholarshipHolderSignature?.trim() &&
              data.letter.editable.scholarshipHolderSignedDate?.trim()
          )
        );
        setPersistedHostSigned(
          Boolean(
            data.letter.editable.hostContactSignature?.trim() &&
              data.letter.editable.hostContactSignedDate?.trim()
          )
        );
        setEditing(
          isSendMode || isSignMode ? false : startEditing || !data.letter.shared
        );
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
  }, [applicationId, isSendMode, isSignMode, startEditing]);

  const updateField = (
    key: keyof NomineeLetterEditableFields,
    value: string
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSendError(null);
    setShareSuccess(null);
  };

  const fieldsReadOnly =
    isSendMode || isSignMode || Boolean(letter?.shared && !editing);

  const nomineeSignatureReady = Boolean(
    fields?.scholarshipHolderSignature?.trim() &&
      fields?.scholarshipHolderSignedDate?.trim()
  );
  const hostSignatureReady = Boolean(
    fields?.hostContactSignature?.trim() &&
      fields?.hostContactSignedDate?.trim()
  );

  // Signing workflow:
  // - Coordinator: never
  // - Nominee (/applicant): scholarship holder only, until saved
  // - Administrator: host contact only, after nominee has saved, until host saved
  const canSignScholarshipHolder = isSignMode && !persistedNomineeSigned;
  const canSignHostContact =
    isSendMode && persistedNomineeSigned && !persistedHostSigned;

  const derivedDates = useMemo(() => {
    if (!isSendMode || !letterDateInput.trim()) {
      return {
        letterDate: NOMINEE_LETTER_PENDING,
        responseDeadline: NOMINEE_LETTER_PENDING,
      };
    }
    try {
      return nomineeLetterDatesFromInput(letterDateInput);
    } catch {
      return {
        letterDate: NOMINEE_LETTER_PENDING,
        responseDeadline: NOMINEE_LETTER_PENDING,
      };
    }
  }, [isSendMode, letterDateInput]);

  const displayAuto = useMemo(() => {
    if (!letter) return null;
    if (!isSendMode) return letter.auto;
    return {
      ...letter.auto,
      letterDate: derivedDates.letterDate,
      responseDeadline: derivedDates.responseDeadline,
    };
  }, [derivedDates, isSendMode, letter]);

  const handleSaveHostSignature = async () => {
    if (!fields) return;
    setSending(true);
    setSendError(null);
    setShareSuccess(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/nominee-letter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sign-host",
            hostContactSignature: fields.hostContactSignature,
            hostContactSignedDate: fields.hostContactSignedDate,
          }),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSendError(data.error ?? "Could not save the host contact signature.");
        return;
      }
      setShareSuccess("Host contact signature saved.");
      setPersistedHostSigned(true);
    } catch {
      setSendError("Could not save the host contact signature.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async () => {
    if (!fields) return;
    setSending(true);
    setSendError(null);
    setShareSuccess(null);
    try {
      if (isSignMode) {
        const res = await fetch("/api/applicant/nominee-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sign",
            scholarshipHolderSignature: fields.scholarshipHolderSignature,
            scholarshipHolderSignedDate: fields.scholarshipHolderSignedDate,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setSendError(data.error ?? "Could not save your signature.");
          return;
        }
        const message = "Scholarship agreement signature saved.";
        setPersistedNomineeSigned(true);
        setShareSuccess(message);
        onSigned?.(message);
        return;
      }

      const res = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/nominee-letter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isSendMode
              ? { action: "send", letterDate: letterDateInput }
              : { action: "share", ...fields }
          ),
        }
      );
      const data = (await res.json()) as {
        error?: string;
        warning?: string;
        email?: string;
      };
      if (!res.ok) {
        setSendError(
          data.error ??
            (isSendMode
              ? "Could not send the nomination letter."
              : "Could not share the nomination letter.")
        );
        return;
      }
      const email =
        data.email ??
        (isSendMode
          ? letter?.applicantEmail
          : letter?.auto.focalPersonEmail) ??
        "the recipient";
      const message = data.warning
        ? isSendMode
          ? `Nomination letter prepared for ${email}. ${data.warning}`
          : `Nomination letter shared with ${email}. ${data.warning}`
        : isSendMode
          ? `Nomination letter sent to ${email}.`
          : `Nomination letter shared with ${email}.`;

      if (isSendMode) {
        onSent(message);
        return;
      }

      setLetter((prev) => (prev ? { ...prev, shared: true } : prev));
      setEditing(false);
      setShareSuccess(message);
      onDraftShared?.(message);
    } catch {
      setSendError(
        isSignMode
          ? "Could not save your signature."
          : isSendMode
            ? "Could not send the nomination letter."
            : "Could not share the nomination letter."
      );
    } finally {
      setSending(false);
    }
  };

  const auto = displayAuto;

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
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="nominee-letter-title"
              className="text-base font-bold text-[#062763]"
            >
              {isSignMode
                ? "Scholarship Agreement"
                : "Nomination Letter"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              {applicantName || applicationId}
              {isSignMode
                ? " · Review your nomination letter and scholarship agreement, then append your digital signature."
                : isSendMode
                  ? " · Review the coordinator-shared letter, set the date, then send."
                  : letter?.shared && !editing
                    ? " · Draft shared with the host focal person. Edit to make changes."
                    : " · Complete the editable fields, then share with the host focal person."}
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

          {auto && !isSendMode && !auto.focalPersonName.trim() && (
            <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              No focal person is set for{" "}
              {letter?.editable.hostUniversity || "this host institution"}. Open
              Users, edit a member of that institution, and tick
              &ldquo;Institution&apos;s focal person&rdquo; to fill the contact
              person, e-mail, and address.
            </p>
          )}

          {letter?.sent && isSendMode && (
            <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
              This nomination letter was already sent. Sending again will email
              the applicant with the new date.
            </p>
          )}

          {auto && fields && (
            <div className="space-y-6">
              <NomineeLetterPage
                pageNumber={1}
                totalPages={NOMINEE_DOCUMENT_TOTAL_PAGES}
                priorityHeader
              >
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                <p>
                  Our Ref: SMECC2E/<AutoValue value={auto.applicantNo} />
                </p>
                <p>
                  Date:{" "}
                  {isSendMode ? (
                    <EditableInput
                      id="nominee-letter-date"
                      label="Letter date"
                      type="date"
                      value={letterDateInput}
                      onChange={(value) => {
                        setLetterDateInput(value);
                        setSendError(null);
                      }}
                      disabled={sending}
                      width="11rem"
                    />
                  ) : (
                    <AutoValue value={auto.letterDate} />
                  )}
                </p>
              </div>

              <h3 className="text-center text-base font-bold text-slate-900">
                Nomination Letter
              </h3>

              <p className={letterParagraphClass}>
                Dear{" "}
                <AutoValue
                  value={[auto.firstName, auto.surname]
                    .map((part) => part?.trim())
                    .filter(Boolean)
                    .join(" ")}
                  missingLabel="[first name] [surname]"
                />
                ,
              </p>

              <p className={letterParagraphClass}>
                We are pleased to inform you that your application (
                <AutoValue value={auto.applicantNo} />) for the Intra-Africa –
                Mobility in Sustainable Energy &amp; Materials, Energy Policy,
                Climate Change, Energy Economics and Environment (SMECC2E)
                Scholarship was successful and you were selected for a stay at
                the{" "}
                {fieldsReadOnly ? (
                  <AutoValue value={fields.hostUniversity} />
                ) : (
                  <EditableInput
                    id="nominee-host-university"
                    label="Host university"
                    value={fields.hostUniversity}
                    onChange={(value) => updateField("hostUniversity", value)}
                    disabled={sending}
                    placeholder="Host university"
                    width="18rem"
                  />
                )}
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
                  {fieldsReadOnly ? (
                    <AutoValue value={fields.hostUniversity} />
                  ) : (
                    <EditableInput
                      id="nominee-host-university-detail"
                      label="Host university (details)"
                      value={fields.hostUniversity}
                      onChange={(value) => updateField("hostUniversity", value)}
                      disabled={sending}
                      placeholder="Host university"
                      width="18rem"
                    />
                  )}
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
                  <EmailLink
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
                  {fieldsReadOnly ? (
                    <AutoValue value={fields.mobilityType} />
                  ) : (
                    <EditableInput
                      id="nominee-mobility-type"
                      label="Type of mobility"
                      value={fields.mobilityType}
                      onChange={(value) => updateField("mobilityType", value)}
                      disabled={sending}
                      placeholder="Type of mobility"
                      width="18rem"
                    />
                  )}
                </p>

                <p className={detailLabelClass}>Area of study/work:</p>
                <p className="text-sm text-slate-800">
                  {fieldsReadOnly ? (
                    <AutoValue value={fields.areaOfStudy} />
                  ) : (
                    <EditableInput
                      id="nominee-area-of-study"
                      label="Area of study or work"
                      value={fields.areaOfStudy}
                      onChange={(value) => updateField("areaOfStudy", value)}
                      disabled={sending}
                      placeholder="Proposed programme"
                      width="18rem"
                    />
                  )}
                </p>

                <p className={detailLabelClass}>Maximum duration:</p>
                <p className="text-sm text-slate-800">
                  {fieldsReadOnly ? (
                    <AutoValue value={fields.durationMonths} />
                  ) : (
                    <EditableInput
                      id="nominee-duration"
                      label="Maximum duration in months"
                      value={fields.durationMonths}
                      onChange={(value) => updateField("durationMonths", value)}
                      disabled={sending}
                      placeholder="e.g. 24"
                      width="6rem"
                    />
                  )}{" "}
                  months
                </p>

                <p className={detailLabelClass}>
                  Target group (students only):
                </p>
                <p className="text-sm text-slate-800">
                  {fieldsReadOnly ? (
                    <AutoValue value={fields.targetGroup} />
                  ) : (
                    <EditableSelect
                      id="nominee-target-group"
                      label="Target group"
                      value={fields.targetGroup}
                      options={NOMINEE_TARGET_GROUP_OPTIONS}
                      onChange={(value) => updateField("targetGroup", value)}
                      disabled={sending}
                      placeholder="Select target group"
                    />
                  )}
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
                If you accept the scholarship nomination and agree with the
                terms of the enclosed scholarship agreement, please login to the{" "}
                <a
                  href={SMECC2E_PORTAL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 underline"
                >
                  SMECC2E Integrated portal
                </a>{" "}
                and sign the scholarship agreement on the portal. Download a
                copy of the signed agreement and send back to the Host
                University at <AutoValue value={auto.focalPersonName} /> (
                <EmailLink value={auto.focalPersonEmail} />) and a copy to us at{" "}
                <a
                  href={`mailto:${SMECC2E_PROJECT_EMAIL}`}
                  className="font-semibold text-blue-700 underline"
                >
                  {SMECC2E_PROJECT_EMAIL}
                </a>{" "}
                on or before 2 weeks from the date:{" "}
                <AutoValue value={auto.letterDate} />, so that we can start
                taking the practical arrangements for your mobility. Failure to
                sign and submit the scholarship agreement within the stipulated
                period means that you have decided to forfeit/reject the
                nomination.
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
                {fieldsReadOnly ? (
                  <AutoValue value={fields.hostUniversity} />
                ) : (
                  <EditableInput
                    id="nominee-host-university-closing"
                    label="Host university (closing)"
                    value={fields.hostUniversity}
                    onChange={(value) => updateField("hostUniversity", value)}
                    disabled={sending}
                    placeholder="Host university"
                    width="18rem"
                  />
                )}
                , in <AutoValue value={auto.hostCountry} />.
              </p>

              <div className="pt-2 text-sm leading-6 text-slate-800">
                <p>Yours sincerely,</p>
                <Image
                  src="/images/letter-signature.png"
                  alt="Signature of Dr. Patrick Udeme-obong Akpan"
                  width={564}
                  height={323}
                  className="mt-2 h-auto w-full max-w-28"
                />
                <div className="mt-2 space-y-0.5 font-semibold">
                  {PROJECT_COORDINATOR_SIGNATURE.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              </NomineeLetterPage>

              <NomineeScholarshipAgreement
                auto={auto}
                fields={fields}
                readOnly={fieldsReadOnly}
                disabled={sending}
                onFieldChange={updateField}
                totalPages={NOMINEE_DOCUMENT_TOTAL_PAGES}
                canSignScholarshipHolder={canSignScholarshipHolder}
                canSignHostContact={canSignHostContact}
              />
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
          {shareSuccess && !sendError && (
            <p
              className="mb-3 text-sm font-semibold text-emerald-700"
              role="status"
            >
              {shareSuccess}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-700">
              {isSignMode
                ? persistedNomineeSigned
                  ? "Your digital signature is saved."
                  : "Append your digital signature on the last page, then save."
                : isSendMode
                  ? !persistedNomineeSigned
                    ? "Waiting for the nominee to sign the scholarship agreement before the host contact can sign."
                    : persistedHostSigned
                      ? letter?.applicantEmail
                        ? `Host contact has signed. Sends to ${letter.applicantEmail}, copying coordinators and the host focal person.`
                        : "Host contact has signed. Sends to the applicant, copying coordinators and the host focal person."
                      : "Nominee has signed. Append the host contact digital signature on the last page, then save it."
                  : letter?.auto.focalPersonEmail
                    ? `Shares with ${letter.auto.focalPersonEmail}, copying coordinators.`
                    : "Shares with the host focal person, copying coordinators."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {letter?.shared && !isSendMode && !isSignMode && !editing
                  ? "Close"
                  : isSignMode
                    ? "Close"
                    : "Cancel"}
              </button>
              {!isSendMode && !isSignMode && letter?.shared && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setShareSuccess(null);
                    setSendError(null);
                  }}
                  disabled={sending}
                  className="rounded-lg border-2 border-[#062763]/30 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                >
                  Edit
                </button>
              )}
              {isSignMode ? (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={
                    sending ||
                    loading ||
                    !fields ||
                    Boolean(loadError) ||
                    persistedNomineeSigned ||
                    !nomineeSignatureReady
                  }
                  className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
                >
                  {persistedNomineeSigned
                    ? "Signature saved"
                    : sending
                      ? "Saving…"
                      : "Save signature"}
                </button>
              ) : isSendMode ? (
                <>
                  {persistedNomineeSigned && !persistedHostSigned && (
                    <button
                      type="button"
                      onClick={() => void handleSaveHostSignature()}
                      disabled={
                        sending ||
                        loading ||
                        !fields ||
                        Boolean(loadError) ||
                        !hostSignatureReady
                      }
                      className="rounded-lg border-2 border-[#062763]/30 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                    >
                      {sending ? "Saving…" : "Save host signature"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={
                      sending ||
                      loading ||
                      !fields ||
                      Boolean(loadError) ||
                      !letterDateInput.trim()
                    }
                    className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send nominee letter"}
                  </button>
                </>
              ) : letter?.shared && !editing ? (
                <button
                  type="button"
                  disabled
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-100"
                >
                  Draft Shared
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={sending || loading || !fields || Boolean(loadError)}
                  className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
                >
                  {sending ? "Sharing…" : "Share with focal person"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
