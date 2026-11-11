"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const SUPPORT_TYPES = [
  ["assistive", "Assistive device/technology"],
  ["accommodation", "Accessible accommodation"],
  ["mobility", "Mobility or transport support"],
  ["personal", "Personal assistance or support service"],
  ["communication", "Communication or interpretation support"],
  ["materials", "Accessible learning or work materials"],
  ["other", "Other approved reasonable accommodation"],
] as const;

type SupportTypeId = (typeof SUPPORT_TYPES)[number][0];
type EstimateBasis = "" | "quotation" | "proforma" | "service" | "other";
type DisbursementMethod =
  | ""
  | "direct-supplier"
  | "reimbursement"
  | "advance"
  | "host"
  | "other";
type YesNo = "" | "yes" | "no";
type YesPartlyNo = "" | "yes" | "partly" | "no";
type YesNoUncertain = "" | "yes" | "no" | "uncertain";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
  focalPerson: string;
};

type ExpenditureRow = {
  id: string;
  date: string;
  item: string;
  supplier: string;
  receiptRef: string;
  amount: string;
  remarks: string;
};

type FormState = {
  supportTypes: SupportTypeId[];
  functionalNeed: string;
  periodFrom: string;
  periodTo: string;
  estimatedCurrency: string;
  estimatedAmount: string;
  estimateBasis: EstimateBasis;
  supplier: string;
  alternatives: string;
  urgencyDate: string;
  urgencyReason: string;
  disbursementMethod: DisbursementMethod;
  quotationAttached: boolean;
  quotationFileName: string;
  needEvidenceAttached: boolean;
  needEvidenceFileName: string;
  hostRecommendationAttached: boolean;
  hostRecommendationFileName: string;
  otherDocsAttached: boolean;
  otherDocsFileName: string;
  declareRelated: boolean;
  declareSubjectToRules: boolean;
  expenditureRows: ExpenditureRow[];
  totalApproved: string;
  totalDisbursed: string;
  totalEligible: string;
  unspentBalance: string;
  refundAmount: string;
  refundReference: string;
  ineligibleIdentified: YesNo;
  ineligibleDetails: string;
  finalReconciled: string;
  supportReceived: string;
  supportAvailable: YesPartlyNo;
  supportAvailableExplain: string;
  howEnabled: string;
  unmetNeed: string;
  futureSupport: YesNoUncertain;
  futureSupportComments: string;
  supplierFeedback: string;
  receiptsReportAttached: boolean;
  receiptsReportFileName: string;
  proofOfPaymentAttached: boolean;
  proofOfPaymentFileName: string;
  deliveryConfirmAttached: boolean;
  deliveryConfirmFileName: string;
  refundProofAttached: boolean;
  refundProofFileName: string;
  otherReportDocsAttached: boolean;
  otherReportDocsFileName: string;
  certifyExpenditure: boolean;
  certifyRefund: boolean;
  signature: string;
  signedAt: string;
};

function emptyRows(): ExpenditureRow[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `row-${index + 1}`,
    date: "",
    item: "",
    supplier: "",
    receiptRef: "",
    amount: "",
    remarks: "",
  }));
}

const EMPTY_FORM: FormState = {
  supportTypes: [],
  functionalNeed: "",
  periodFrom: "",
  periodTo: "",
  estimatedCurrency: "",
  estimatedAmount: "",
  estimateBasis: "",
  supplier: "",
  alternatives: "",
  urgencyDate: "",
  urgencyReason: "",
  disbursementMethod: "",
  quotationAttached: false,
  quotationFileName: "",
  needEvidenceAttached: false,
  needEvidenceFileName: "",
  hostRecommendationAttached: false,
  hostRecommendationFileName: "",
  otherDocsAttached: false,
  otherDocsFileName: "",
  declareRelated: false,
  declareSubjectToRules: false,
  expenditureRows: emptyRows(),
  totalApproved: "",
  totalDisbursed: "",
  totalEligible: "",
  unspentBalance: "",
  refundAmount: "",
  refundReference: "",
  ineligibleIdentified: "",
  ineligibleDetails: "",
  finalReconciled: "",
  supportReceived: "",
  supportAvailable: "",
  supportAvailableExplain: "",
  howEnabled: "",
  unmetNeed: "",
  futureSupport: "",
  futureSupportComments: "",
  supplierFeedback: "",
  receiptsReportAttached: false,
  receiptsReportFileName: "",
  proofOfPaymentAttached: false,
  proofOfPaymentFileName: "",
  deliveryConfirmAttached: false,
  deliveryConfirmFileName: "",
  refundProofAttached: false,
  refundProofFileName: "",
  otherReportDocsAttached: false,
  otherReportDocsFileName: "",
  certifyExpenditure: false,
  certifyRefund: false,
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
  return `smecc2e.special-needs.${applicationId}`;
}

export function SpecialNeedsDisbursementForm({
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
        setForm({ ...EMPTY_FORM, expenditureRows: emptyRows() });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        supportTypes: parsed.supportTypes ?? [],
        expenditureRows:
          parsed.expenditureRows && parsed.expenditureRows.length > 0
            ? parsed.expenditureRows
            : emptyRows(),
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({ ...EMPTY_FORM, expenditureRows: emptyRows() });
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
            auto?: { nationality?: string; focalPersonName?: string };
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

  const toggleSupport = (id: SupportTypeId) => {
    const next = form.supportTypes.includes(id)
      ? form.supportTypes.filter((item) => item !== id)
      : [...form.supportTypes, id];
    update({ supportTypes: next });
  };

  const updateRow = (id: string, patch: Partial<ExpenditureRow>) => {
    update({
      expenditureRows: form.expenditureRows.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const sign = () => {
    if (saved) return;
    if (form.supportTypes.length === 0) {
      setError("Select at least one type of support requested.");
      return;
    }
    if (!form.functionalNeed.trim()) {
      setError("Describe the brief functional support need.");
      return;
    }
    if (!form.periodFrom.trim() || !form.periodTo.trim()) {
      setError("Enter the period for which support is required.");
      return;
    }
    if (!form.estimatedAmount.trim()) {
      setError("Enter the estimated total cost.");
      return;
    }
    if (!form.estimateBasis) {
      setError("Choose the basis of estimate.");
      return;
    }
    if (!form.disbursementMethod) {
      setError("Choose a requested disbursement method.");
      return;
    }
    if (!form.declareRelated || !form.declareSubjectToRules) {
      setError("Confirm both scholar declarations before you sign.");
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
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/70">
            SMECC2E integrated portal
          </p>
          <h1 className="mt-2 text-lg font-bold tracking-wide sm:text-xl">
            Special needs funds disbursement & reporting form
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Form code: FIN-09 | Module: Finance & inclusion support | Primary
            user: Scholar / Host HEI / Project finance
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Request, approve, disburse, account for and reconcile special-needs
          support provided to an eligible SMECC2E participant.
        </p>

        <FormTable title="Participant / mobility record">
          <ReadRow label="Mobility cohort" value="Pending" />
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
            label="Host institution / organisation"
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

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Section A: Special needs support request / eligibility (by scholar)
          </h2>
        </section>

        <FormTable title="Support request">
          <ChoiceRow label="Type of support requested">
            <div className="flex flex-col gap-2">
              {SUPPORT_TYPES.map(([id, label]) => (
                <label
                  key={id}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.supportTypes.includes(id)}
                    disabled={saved}
                    onChange={() => toggleSupport(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </ChoiceRow>
          <TextRow
            label="Brief functional support need"
            value={form.functionalNeed}
            disabled={saved}
            multiline
            placeholder="Describe the practical barrier and support required. Do not include diagnosis or unnecessary sensitive medical information."
            onChange={(functionalNeed) => update({ functionalNeed })}
          />
          <ChoiceRow label="Period for which support is required">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                <span className="font-semibold text-[#062763]">From</span>
                <input
                  type="date"
                  value={form.periodFrom}
                  disabled={saved}
                  onChange={(event) =>
                    update({ periodFrom: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                <span className="font-semibold text-[#062763]">To</span>
                <input
                  type="date"
                  value={form.periodTo}
                  disabled={saved}
                  onChange={(event) =>
                    update({ periodTo: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              </label>
            </div>
          </ChoiceRow>
          <ChoiceRow label="Estimated total cost">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={form.estimatedCurrency}
                disabled={saved}
                placeholder="Currency"
                onChange={(event) =>
                  update({ estimatedCurrency: event.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
              <input
                type="text"
                value={form.estimatedAmount}
                disabled={saved}
                placeholder="Amount"
                onChange={(event) =>
                  update({ estimatedAmount: event.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
            </div>
          </ChoiceRow>
          <ChoiceRow label="Basis of estimate">
            <RadioGroup
              name="estimate-basis"
              value={form.estimateBasis}
              disabled={saved}
              onChange={(estimateBasis) =>
                update({ estimateBasis: estimateBasis as EstimateBasis })
              }
              options={[
                ["quotation", "Quotation"],
                ["proforma", "Pro-forma invoice"],
                ["service", "Service estimate"],
                ["other", "Other"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Supplier / service provider"
            value={form.supplier}
            disabled={saved}
            multiline
            placeholder="Name, address/contact details, where known"
            onChange={(supplier) => update({ supplier })}
          />
          <TextRow
            label="Alternative options considered"
            value={form.alternatives}
            disabled={saved}
            placeholder="Text / N/A"
            onChange={(alternatives) => update({ alternatives })}
          />
          <ChoiceRow label="Urgency / required-by date">
            <div className="grid gap-2">
              <input
                type="date"
                value={form.urgencyDate}
                disabled={saved}
                onChange={(event) =>
                  update({ urgencyDate: event.target.value })
                }
                className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
              <textarea
                value={form.urgencyReason}
                disabled={saved}
                rows={2}
                placeholder="Brief reason"
                onChange={(event) =>
                  update({ urgencyReason: event.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
            </div>
          </ChoiceRow>
          <ChoiceRow label="Requested disbursement method">
            <RadioGroup
              name="disbursement-method"
              value={form.disbursementMethod}
              disabled={saved}
              onChange={(disbursementMethod) =>
                update({
                  disbursementMethod: disbursementMethod as DisbursementMethod,
                })
              }
              options={[
                ["direct-supplier", "Direct payment to supplier"],
                ["reimbursement", "Reimbursement to scholar"],
                ["advance", "Advance to scholar"],
                ["host", "Payment through host institution"],
                ["other", "Other"],
              ]}
            />
          </ChoiceRow>
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting documents for request
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Quotation(s), pro-forma invoice(s) or cost estimate(s), where applicable"
              checked={form.quotationAttached}
              fileName={form.quotationFileName}
              disabled={saved}
              onCheckedChange={(quotationAttached) =>
                update({
                  quotationAttached,
                  quotationFileName: quotationAttached
                    ? form.quotationFileName
                    : "",
                })
              }
              onFileNameChange={(quotationFileName) =>
                update({ quotationAttached: true, quotationFileName })
              }
            />
            <AttachmentRow
              label="Evidence confirming the need for reasonable accommodation/support, only to the extent required by project rules"
              checked={form.needEvidenceAttached}
              fileName={form.needEvidenceFileName}
              disabled={saved}
              onCheckedChange={(needEvidenceAttached) =>
                update({
                  needEvidenceAttached,
                  needEvidenceFileName: needEvidenceAttached
                    ? form.needEvidenceFileName
                    : "",
                })
              }
              onFileNameChange={(needEvidenceFileName) =>
                update({ needEvidenceAttached: true, needEvidenceFileName })
              }
            />
            <AttachmentRow
              label="Host institution recommendation or accessibility/support assessment, where applicable"
              checked={form.hostRecommendationAttached}
              fileName={form.hostRecommendationFileName}
              disabled={saved}
              onCheckedChange={(hostRecommendationAttached) =>
                update({
                  hostRecommendationAttached,
                  hostRecommendationFileName: hostRecommendationAttached
                    ? form.hostRecommendationFileName
                    : "",
                })
              }
              onFileNameChange={(hostRecommendationFileName) =>
                update({
                  hostRecommendationAttached: true,
                  hostRecommendationFileName,
                })
              }
            />
            <AttachmentRow
              label="Other supporting documentation requested by the authorised reviewer"
              checked={form.otherDocsAttached}
              fileName={form.otherDocsFileName}
              disabled={saved}
              onCheckedChange={(otherDocsAttached) =>
                update({
                  otherDocsAttached,
                  otherDocsFileName: otherDocsAttached
                    ? form.otherDocsFileName
                    : "",
                })
              }
              onFileNameChange={(otherDocsFileName) =>
                update({ otherDocsAttached: true, otherDocsFileName })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Scholar declaration
          </h2>
          <div className="mt-3 space-y-3 px-1 text-sm leading-6 text-slate-700">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareRelated}
                disabled={saved}
                onChange={(event) =>
                  update({ declareRelated: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                I confirm that the support requested is directly related to my
                participation in the approved SMECC2E mobility and that the
                information provided is accurate.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.declareSubjectToRules}
                disabled={saved}
                onChange={(event) =>
                  update({ declareSubjectToRules: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                I understand that approval is subject to applicable SMECC2E/EU
                rules and does not arise automatically from submission of this
                request.
              </span>
            </label>
          </div>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />

        <FormTable title="Section B. Review, approval & funding decision">
          <ReadRow label="Eligibility review outcome" value="Pending" />
          <ReadRow label="Approved support item(s)" value="Pending" />
          <ReadRow label="Approved amount" value="Pending" />
          <ReadRow label="Approved funding period" value="Pending" />
          <ReadRow label="Approved disbursement method" value="Pending" />
          <ReadRow label="Required reporting deadline" value="Pending" />
          <ReadRow label="Budget / financial reference" value="Pending" />
          <ReadRow label="Approval comments" value="Pending" />
        </FormTable>
        <SignTable
          title="Section B sign-off"
          rows={[
            {
              role: "Host institution focal person / inclusion contact",
              name: pending(letter?.focalPerson),
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Project finance officer",
              name: "Project finance officer",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "SMECC2E coordinator / authorised approver",
              name: "SMECC2E coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <FormTable title="Section C. Disbursement record">
          <ReadRow label="Disbursement reference" value="Pending" />
          <ReadRow label="Approved amount" value="Pending" />
          <ReadRow label="Amount disbursed" value="Pending" />
          <ReadRow label="Payee" value="Pending" />
          <ReadRow label="Payment method" value="Pending" />
          <ReadRow label="Payment date" value="Pending" />
          <ReadRow label="Bank / transaction reference" value="Pending" />
          <ReadRow
            label="Any variance from approved amount"
            value="Pending"
          />
          <ReadRow
            label="Balance remaining after disbursement"
            value="Pending"
          />
        </FormTable>
        <SignTable
          title="Finance confirmation"
          rows={[
            {
              role: "Host finance officer",
              name: "Host finance officer",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Section D. Utilization / expenditure report by the scholar
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            Complete after the approved support has been used or by the
            reporting deadline, whichever occurs first.
          </p>
        </section>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">No.</th>
                <th className="border border-slate-300 px-2 py-2">Date</th>
                <th className="border border-slate-300 px-2 py-2">
                  Item / service
                </th>
                <th className="border border-slate-300 px-2 py-2">Supplier</th>
                <th className="border border-slate-300 px-2 py-2">
                  Receipt / invoice ref.
                </th>
                <th className="border border-slate-300 px-2 py-2">Amount</th>
                <th className="border border-slate-300 px-2 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {form.expenditureRows.map((row, index) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2 text-center font-semibold text-[#062763]">
                    {index + 1}
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="date"
                      value={row.date}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { date: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.item}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { item: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.supplier}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { supplier: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.receiptRef}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { receiptRef: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.amount}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { amount: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <input
                      type="text"
                      value={row.remarks}
                      disabled={saved}
                      onChange={(event) =>
                        updateRow(row.id, { remarks: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <FormTable title="Financial reconciliation">
          <TextRow
            label="Total amount approved"
            value={form.totalApproved}
            disabled={saved}
            placeholder="Currency and amount"
            onChange={(totalApproved) => update({ totalApproved })}
          />
          <TextRow
            label="Total amount disbursed"
            value={form.totalDisbursed}
            disabled={saved}
            placeholder="Currency and amount"
            onChange={(totalDisbursed) => update({ totalDisbursed })}
          />
          <TextRow
            label="Total eligible expenditure reported"
            value={form.totalEligible}
            disabled={saved}
            placeholder="Currency and amount"
            onChange={(totalEligible) => update({ totalEligible })}
          />
          <TextRow
            label="Unspent balance"
            value={form.unspentBalance}
            disabled={saved}
            placeholder="Currency and amount"
            onChange={(unspentBalance) => update({ unspentBalance })}
          />
          <TextRow
            label="Amount to be refunded, if any"
            value={form.refundAmount}
            disabled={saved}
            placeholder="Currency and amount"
            onChange={(refundAmount) => update({ refundAmount })}
          />
          <TextRow
            label="Refund / recovery reference"
            value={form.refundReference}
            disabled={saved}
            placeholder="Text / N/A"
            onChange={(refundReference) => update({ refundReference })}
          />
          <ChoiceRow label="Any ineligible or unsupported expenditure identified">
            <div className="space-y-2">
              <RadioGroup
                name="ineligible"
                value={form.ineligibleIdentified}
                disabled={saved}
                onChange={(ineligibleIdentified) =>
                  update({
                    ineligibleIdentified: ineligibleIdentified as YesNo,
                    ineligibleDetails:
                      ineligibleIdentified === "yes"
                        ? form.ineligibleDetails
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                ]}
              />
              {form.ineligibleIdentified === "yes" && (
                <textarea
                  value={form.ineligibleDetails}
                  disabled={saved}
                  rows={2}
                  placeholder="Amount and explanation"
                  onChange={(event) =>
                    update({ ineligibleDetails: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="Final reconciled amount"
            value={form.finalReconciled}
            disabled={saved}
            placeholder="Currency and amount"
            onChange={(finalReconciled) => update({ finalReconciled })}
          />
        </FormTable>

        <FormTable title="Support outcome / benefit report">
          <TextRow
            label="Support actually received"
            value={form.supportReceived}
            disabled={saved}
            multiline
            onChange={(supportReceived) => update({ supportReceived })}
          />
          <ChoiceRow label="Was the approved support available when needed?">
            <div className="space-y-2">
              <RadioGroup
                name="support-available"
                value={form.supportAvailable}
                disabled={saved}
                onChange={(supportAvailable) =>
                  update({
                    supportAvailable: supportAvailable as YesPartlyNo,
                    supportAvailableExplain:
                      supportAvailable === "partly" ||
                      supportAvailable === "no"
                        ? form.supportAvailableExplain
                        : "",
                  })
                }
                options={[
                  ["yes", "Yes"],
                  ["partly", "Partly"],
                  ["no", "No"],
                ]}
              />
              {(form.supportAvailable === "partly" ||
                form.supportAvailable === "no") && (
                <textarea
                  value={form.supportAvailableExplain}
                  disabled={saved}
                  rows={2}
                  placeholder="Explain"
                  onChange={(event) =>
                    update({ supportAvailableExplain: event.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
                />
              )}
            </div>
          </ChoiceRow>
          <TextRow
            label="How the support enabled participation in the mobility"
            value={form.howEnabled}
            disabled={saved}
            multiline
            placeholder="Brief outcome statement"
            onChange={(howEnabled) => update({ howEnabled })}
          />
          <TextRow
            label="Any unmet accessibility / support need remaining"
            value={form.unmetNeed}
            disabled={saved}
            placeholder="Text / None"
            onChange={(unmetNeed) => update({ unmetNeed })}
          />
          <ChoiceRow label="Would similar support be required for future project activities?">
            <div className="space-y-2">
              <RadioGroup
                name="future-support"
                value={form.futureSupport}
                disabled={saved}
                onChange={(futureSupport) =>
                  update({ futureSupport: futureSupport as YesNoUncertain })
                }
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["uncertain", "Uncertain"],
                ]}
              />
              <textarea
                value={form.futureSupportComments}
                disabled={saved}
                rows={2}
                placeholder="Comments"
                onChange={(event) =>
                  update({ futureSupportComments: event.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
              />
            </div>
          </ChoiceRow>
          <TextRow
            label="Feedback on supplier / service quality, where relevant"
            value={form.supplierFeedback}
            disabled={saved}
            placeholder="Text / N/A"
            onChange={(supplierFeedback) => update({ supplierFeedback })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting documents for reporting
          </h2>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Original/scanned receipts, invoices or supplier payment evidence"
              checked={form.receiptsReportAttached}
              fileName={form.receiptsReportFileName}
              disabled={saved}
              onCheckedChange={(receiptsReportAttached) =>
                update({
                  receiptsReportAttached,
                  receiptsReportFileName: receiptsReportAttached
                    ? form.receiptsReportFileName
                    : "",
                })
              }
              onFileNameChange={(receiptsReportFileName) =>
                update({
                  receiptsReportAttached: true,
                  receiptsReportFileName,
                })
              }
            />
            <AttachmentRow
              label="Proof of payment where the scholar made the purchase/payment"
              checked={form.proofOfPaymentAttached}
              fileName={form.proofOfPaymentFileName}
              disabled={saved}
              onCheckedChange={(proofOfPaymentAttached) =>
                update({
                  proofOfPaymentAttached,
                  proofOfPaymentFileName: proofOfPaymentAttached
                    ? form.proofOfPaymentFileName
                    : "",
                })
              }
              onFileNameChange={(proofOfPaymentFileName) =>
                update({
                  proofOfPaymentAttached: true,
                  proofOfPaymentFileName,
                })
              }
            />
            <AttachmentRow
              label="Delivery/service confirmation where applicable"
              checked={form.deliveryConfirmAttached}
              fileName={form.deliveryConfirmFileName}
              disabled={saved}
              onCheckedChange={(deliveryConfirmAttached) =>
                update({
                  deliveryConfirmAttached,
                  deliveryConfirmFileName: deliveryConfirmAttached
                    ? form.deliveryConfirmFileName
                    : "",
                })
              }
              onFileNameChange={(deliveryConfirmFileName) =>
                update({
                  deliveryConfirmAttached: true,
                  deliveryConfirmFileName,
                })
              }
            />
            <AttachmentRow
              label="Proof of refund of any unspent balance, where applicable"
              checked={form.refundProofAttached}
              fileName={form.refundProofFileName}
              disabled={saved}
              onCheckedChange={(refundProofAttached) =>
                update({
                  refundProofAttached,
                  refundProofFileName: refundProofAttached
                    ? form.refundProofFileName
                    : "",
                })
              }
              onFileNameChange={(refundProofFileName) =>
                update({ refundProofAttached: true, refundProofFileName })
              }
            />
            <AttachmentRow
              label="Other evidence requested for financial verification or audit"
              checked={form.otherReportDocsAttached}
              fileName={form.otherReportDocsFileName}
              disabled={saved}
              onCheckedChange={(otherReportDocsAttached) =>
                update({
                  otherReportDocsAttached,
                  otherReportDocsFileName: otherReportDocsAttached
                    ? form.otherReportDocsFileName
                    : "",
                })
              }
              onFileNameChange={(otherReportDocsFileName) =>
                update({
                  otherReportDocsAttached: true,
                  otherReportDocsFileName,
                })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Scholar / beneficiary certification
          </h2>
          <div className="mt-3 space-y-3 px-1 text-sm leading-6 text-slate-700">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.certifyExpenditure}
                disabled={saved}
                onChange={(event) =>
                  update({ certifyExpenditure: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                I certify that the reported expenditure was incurred only for
                the approved special-needs support and that the attached
                evidence is authentic and complete.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.certifyRefund}
                disabled={saved}
                onChange={(event) =>
                  update({ certifyRefund: event.target.checked })
                }
                className="mt-1"
              />
              <span>
                I will return any unspent or ineligible amount identified
                through the reconciliation process in accordance with
                instructions from SMECC2E Project Finance.
              </span>
            </label>
          </div>
        </section>
        <SignTable
          title="Scholar / beneficiary"
          rows={[
            {
              role: "Scholar / beneficiary",
              name: fullName,
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
          ]}
        />

        <FormTable title="Section E. Financial verification & closure">
          <ReadRow label="Supporting documents complete" value="Pending" />
          <ReadRow label="Expenditure verified as eligible" value="Pending" />
          <ReadRow label="Verified eligible amount" value="Pending" />
          <ReadRow
            label="Unspent / ineligible amount recoverable"
            value="Pending"
          />
          <ReadRow label="Refund confirmed" value="Pending" />
          <ReadRow label="Outstanding action" value="Pending" />
          <ReadRow label="Final status" value="Pending" />
          <ReadRow label="Finance comments" value="Pending" />
        </FormTable>
        <SignTable
          title="Final verification / sign-off"
          rows={[
            {
              role: "Host institution focal person / inclusion contact",
              name: pending(letter?.focalPerson),
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Project finance officer",
              name: "Project finance officer",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "SMECC2E coordinator / authorised approver",
              name: "SMECC2E coordinator",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />

        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">
            Confidentiality / data protection note.{" "}
          </span>
          Only information necessary to assess, fund and account for the
          requested support should be collected. Sensitive personal or health
          information should not be recorded in this form unless strictly
          necessary, proportionate and handled in accordance with applicable
          data-protection and project requirements.
        </p>

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
            Special needs form signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign special needs form"}
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
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
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
          type="text"
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
