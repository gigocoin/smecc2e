"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type CreditSystem = "" | "acts" | "compatible";
type YesNo = "" | "yes" | "no";
type YesNoNa = "" | "yes" | "no" | "na";
type RecognitionStatus =
  | ""
  | "recognised"
  | "partially_recognised"
  | "not_recognised";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type RecognitionRow = {
  id: string;
  hostComponent: string;
  hostCredits: string;
  hostGrade: string;
  mappedHomeComponent: string;
  homeCreditsRecognised: string;
  recognitionStatus: RecognitionStatus;
  reasonRemarks: string;
};

type FormState = {
  cohort: Cohort;
  learningAgreementRef: string;
  amendmentRef: string;
  amendmentNa: boolean;
  transcriptRef: string;
  creditSystem: CreditSystem;
  hostAcademicYearEquivalent: string;
  components: RecognitionRow[];
  totalHostCredits: string;
  totalHomeCredits: string;
  automaticRecognition: YesNo;
  automaticRecognitionExplain: string;
  partialCompletion: YesNoNa;
  academicRecordUpdated: YesNo;
  academicRecordDate: string;
  learningAgreementAttached: boolean;
  learningAgreementFileName: string;
  transcriptAttached: boolean;
  transcriptFileName: string;
  signature: string;
  signedAt: string;
};

function newRow(): RecognitionRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    hostComponent: "",
    hostCredits: "",
    hostGrade: "",
    mappedHomeComponent: "",
    homeCreditsRecognised: "",
    recognitionStatus: "",
    reasonRemarks: "",
  };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  learningAgreementRef: "",
  amendmentRef: "",
  amendmentNa: false,
  transcriptRef: "",
  creditSystem: "",
  hostAcademicYearEquivalent: "",
  components: [newRow(), newRow(), newRow()],
  totalHostCredits: "",
  totalHomeCredits: "",
  automaticRecognition: "",
  automaticRecognitionExplain: "",
  partialCompletion: "",
  academicRecordUpdated: "",
  academicRecordDate: "",
  learningAgreementAttached: false,
  learningAgreementFileName: "",
  transcriptAttached: false,
  transcriptFileName: "",
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
  return `smecc2e.credit-recognition-acts-transfer.${applicationId}`;
}

export function CreditRecognitionActsTransferForm({
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
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        components:
          parsed.components && parsed.components.length > 0
            ? parsed.components
            : EMPTY_FORM.components,
      });
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

  const updateRow = (id: string, patch: Partial<RecognitionRow>) => {
    if (saved) return;
    setError(null);
    setForm((current) => ({
      ...current,
      components: current.components.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
      signature: "",
      signedAt: "",
    }));
  };

  const addRow = () => {
    if (saved) return;
    setForm((current) => ({
      ...current,
      components: [...current.components, newRow()],
      signature: "",
      signedAt: "",
    }));
  };

  const removeRow = (id: string) => {
    if (saved) return;
    setForm((current) => ({
      ...current,
      components:
        current.components.length <= 1
          ? current.components
          : current.components.filter((row) => row.id !== id),
      signature: "",
      signedAt: "",
    }));
  };

  const sign = () => {
    if (saved) return;
    if (!form.learningAgreementRef.trim()) {
      setError("Enter the approved Learning Agreement reference.");
      return;
    }
    if (!form.amendmentNa && !form.amendmentRef.trim()) {
      setError(
        "Enter the latest approved amendment reference, or mark it N/A."
      );
      return;
    }
    if (!form.transcriptRef.trim()) {
      setError("Enter the Transcript of Records reference.");
      return;
    }
    if (!form.creditSystem) {
      setError("Select the credit system.");
      return;
    }
    const filled = form.components.filter(
      (row) =>
        row.hostComponent.trim() ||
        row.hostCredits.trim() ||
        row.mappedHomeComponent.trim()
    );
    if (filled.length === 0) {
      setError("Enter at least one course / component recognition row.");
      return;
    }
    for (const row of filled) {
      if (!row.hostComponent.trim()) {
        setError("Each filled row needs a host component code / title.");
        return;
      }
      if (!row.recognitionStatus) {
        setError("Select a recognition status for each filled component.");
        return;
      }
    }
    if (!form.totalHostCredits.trim()) {
      setError("Enter total host credits successfully completed.");
      return;
    }
    if (!form.totalHomeCredits.trim()) {
      setError("Enter total home credits recognised.");
      return;
    }
    if (!form.automaticRecognition) {
      setError("Indicate whether automatic recognition was achieved.");
      return;
    }
    if (
      form.automaticRecognition === "no" &&
      !form.automaticRecognitionExplain.trim()
    ) {
      setError("Explain why automatic recognition was not achieved.");
      return;
    }
    if (!form.partialCompletion) {
      setError("Indicate whether partial completion recognition applied.");
      return;
    }
    if (!form.academicRecordUpdated) {
      setError("Indicate whether the academic record was updated.");
      return;
    }
    if (
      form.academicRecordUpdated === "yes" &&
      !form.academicRecordDate
    ) {
      setError("Enter the academic record update date.");
      return;
    }
    if (
      !form.learningAgreementAttached ||
      !form.learningAgreementFileName
    ) {
      setError("Attach the approved Learning Agreement / amendment.");
      return;
    }
    if (!form.transcriptAttached || !form.transcriptFileName) {
      setError("Attach the Official Transcript of Records.");
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
    <article className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
            Credit recognition / ACTS transfer form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Home Institution
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Document the formal post-mobility recognition process against the
          approved Learning Agreement. Home Institution declaration and
          sign-off remain Pending until completed by authorised staff.
        </p>

        <FormTable title="Participant record">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="crat-cohort"
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

        <FormTable title="Recognition evidence">
          <TextRow
            label="Approved Learning Agreement reference"
            value={form.learningAgreementRef}
            disabled={saved}
            onChange={(learningAgreementRef) =>
              update({ learningAgreementRef })
            }
          />
          <ChoiceRow label="Latest approved amendment reference">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={form.amendmentNa}
                  disabled={saved}
                  onChange={(event) =>
                    update({
                      amendmentNa: event.target.checked,
                      amendmentRef: event.target.checked
                        ? ""
                        : form.amendmentRef,
                    })
                  }
                />
                N/A
              </label>
              {!form.amendmentNa && (
                <input
                  type="text"
                  value={form.amendmentRef}
                  disabled={saved}
                  onChange={(event) =>
                    update({ amendmentRef: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="Transcript of Records reference"
            value={form.transcriptRef}
            disabled={saved}
            onChange={(transcriptRef) => update({ transcriptRef })}
          />
          <ChoiceRow label="Credit system">
            <RadioGroup
              name="crat-credit-system"
              value={form.creditSystem}
              disabled={saved}
              onChange={(creditSystem) =>
                update({ creditSystem: creditSystem as CreditSystem })
              }
              options={[
                ["acts", "ACTS"],
                ["compatible", "Compatible system"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Host academic year equivalent"
            value={form.hostAcademicYearEquivalent}
            disabled={saved}
            onChange={(hostAcademicYearEquivalent) =>
              update({ hostAcademicYearEquivalent })
            }
          />
        </FormTable>

        <section className="overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#062763] px-4 py-2">
            <h2 className="text-sm font-bold text-white">
              Course / component recognition
            </h2>
            <button
              type="button"
              onClick={addRow}
              disabled={saved}
              className="rounded-md bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-50"
            >
              Add row
            </button>
          </div>
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">
                  Host component code / title
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Host credits
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Host grade
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Mapped home component
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Home credits recognised
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Recognition status
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Reason / remarks
                </th>
                <th className="border border-slate-300 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {form.components.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="text"
                      value={row.hostComponent}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, {
                          hostComponent: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="text"
                      value={row.hostCredits}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { hostCredits: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="text"
                      value={row.hostGrade}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { hostGrade: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="text"
                      value={row.mappedHomeComponent}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, {
                          mappedHomeComponent: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="text"
                      value={row.homeCreditsRecognised}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, {
                          homeCreditsRecognised: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 p-2">
                    <select
                      value={row.recognitionStatus}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, {
                          recognitionStatus: event.target
                            .value as RecognitionStatus,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    >
                      <option value="">Select</option>
                      <option value="recognised">Recognised</option>
                      <option value="partially_recognised">
                        Partially recognised
                      </option>
                      <option value="not_recognised">Not recognised</option>
                    </select>
                  </td>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="text"
                      value={row.reasonRemarks}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, {
                          reasonRemarks: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={saved || form.components.length <= 1}
                      className="text-xs font-semibold text-red-700 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <FormTable title="Outcome">
          <TextRow
            label="Total host credits successfully completed"
            value={form.totalHostCredits}
            disabled={saved}
            onChange={(totalHostCredits) => update({ totalHostCredits })}
          />
          <TextRow
            label="Total home credits recognised"
            value={form.totalHomeCredits}
            disabled={saved}
            onChange={(totalHomeCredits) => update({ totalHomeCredits })}
          />
          <ChoiceRow label="Automatic recognition achieved for approved successful components">
            <div className="space-y-2">
              <RadioGroup
                name="crat-auto"
                value={form.automaticRecognition}
                disabled={saved}
                onChange={(automaticRecognition) =>
                  update({
                    automaticRecognition: automaticRecognition as YesNo,
                    automaticRecognitionExplain:
                      automaticRecognition === "no"
                        ? form.automaticRecognitionExplain
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No — explain"],
                ]}
              />
              {form.automaticRecognition === "no" && (
                <textarea
                  value={form.automaticRecognitionExplain}
                  disabled={saved}
                  rows={3}
                  onChange={(event) =>
                    update({
                      automaticRecognitionExplain: event.target.value,
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <ChoiceRow label="Partial completion recognition applied">
            <RadioGroup
              name="crat-partial"
              value={form.partialCompletion}
              disabled={saved}
              onChange={(partialCompletion) =>
                update({ partialCompletion: partialCompletion as YesNoNa })
              }
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["na", "N/A"],
              ]}
            />
          </ChoiceRow>
          <ChoiceRow label="Academic record updated">
            <div className="space-y-2">
              <RadioGroup
                name="crat-record"
                value={form.academicRecordUpdated}
                disabled={saved}
                onChange={(academicRecordUpdated) =>
                  update({
                    academicRecordUpdated: academicRecordUpdated as YesNo,
                    academicRecordDate:
                      academicRecordUpdated === "yes"
                        ? form.academicRecordDate
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                ]}
              />
              {form.academicRecordUpdated === "yes" && (
                <input
                  type="date"
                  value={form.academicRecordDate}
                  disabled={saved}
                  onChange={(event) =>
                    update({ academicRecordDate: event.target.value })
                  }
                  className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Approved Learning Agreement / amendment"
              checked={form.learningAgreementAttached}
              fileName={form.learningAgreementFileName}
              disabled={saved}
              onCheckedChange={(learningAgreementAttached) =>
                update({
                  learningAgreementAttached,
                  learningAgreementFileName: learningAgreementAttached
                    ? form.learningAgreementFileName
                    : "",
                })
              }
              onFileNameChange={(learningAgreementFileName) =>
                update({
                  learningAgreementAttached: true,
                  learningAgreementFileName,
                })
              }
            />
            <AttachmentRow
              label="Official Transcript of Records"
              checked={form.transcriptAttached}
              fileName={form.transcriptFileName}
              disabled={saved}
              onCheckedChange={(transcriptAttached) =>
                update({
                  transcriptAttached,
                  transcriptFileName: transcriptAttached
                    ? form.transcriptFileName
                    : "",
                })
              }
              onFileNameChange={(transcriptFileName) =>
                update({ transcriptAttached: true, transcriptFileName })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Declaration / commitment
          </h2>
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            Pending — The Home Institution confirms the recognition decision and
            that successfully completed approved components are counted toward
            the student&apos;s programme except where a documented and approved
            exception applies.
          </p>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Home Institution Coordinator / Registry",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Home Academic Mentor",
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
            Credit recognition details acknowledged
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
            ? "Recognition acknowledged"
            : "Acknowledge recognition details"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
}) {
  return (
    <ChoiceRow label={label}>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
      />
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
