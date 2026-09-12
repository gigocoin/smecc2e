"use client";

import {
  NOMINEE_HOLDER_TYPE_OPTIONS,
  NOMINEE_MOBILITY_ACTIVITY_OPTIONS,
  NOMINEE_PLAN_DOCUMENT_OPTIONS,
  NOMINEE_TARGET_GROUP_OPTIONS,
  PRIVACY_STATEMENT_URL,
  SMECC2E_PORTAL_URL,
  SMECC2E_PROJECT_EMAIL,
  formatOptionalNomineeLetterDate,
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

export const NOMINEE_DOCUMENT_TOTAL_PAGES = 13;

const COORDINATOR_EMAIL = "Patrick.akpan@unn.edu.ng";

function ArticleHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="pt-2 text-sm font-bold text-slate-900">{children}</h4>
  );
}

function Clause({ children }: { children: React.ReactNode }) {
  return <p className={letterParagraphClass}>{children}</p>;
}

function ClauseList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-1 pl-8 text-sm leading-7 text-slate-800">
      {children}
    </ul>
  );
}

function PortalLink({ label = "SMECC2E Integrated Portal" }: { label?: string }) {
  return (
    <a
      href={SMECC2E_PORTAL_URL}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-blue-700 underline"
    >
      {label}
    </a>
  );
}

function ProjectEmailLink() {
  return (
    <a
      href={`mailto:${SMECC2E_PROJECT_EMAIL}`}
      className="font-semibold text-blue-700 underline"
    >
      {SMECC2E_PROJECT_EMAIL}
    </a>
  );
}

/** A signature line the parties complete when signing on the portal. */
function SignatureLine({ label }: { label: string }) {
  return (
    <span className="inline-block min-w-56 border-b border-slate-400 align-bottom text-xs font-semibold text-slate-500">
      {label}
    </span>
  );
}

export function NomineeScholarshipAgreement({
  auto,
  fields,
  readOnly,
  disabled,
  onFieldChange,
  totalPages,
}: {
  auto: NomineeLetterAutoFields;
  fields: NomineeLetterEditableFields;
  readOnly: boolean;
  disabled: boolean;
  onFieldChange: (
    key: keyof NomineeLetterEditableFields,
    value: string
  ) => void;
  totalPages?: number;
}) {
  const pages = totalPages ?? NOMINEE_DOCUMENT_TOTAL_PAGES;
  const applicantFullName = [auto.firstName, auto.surname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Agreement PDF page 1 / document page 2 */}
      <NomineeLetterPage pageNumber={2} totalPages={pages}>
      <div>
        <p className="text-sm font-bold text-slate-900">
          Scholarship Agreement No: <AutoValue value={auto.applicantNo} />
        </p>
        <p className="mt-6 text-sm font-bold text-slate-900">
          European Union Funding Disclaimer:
        </p>
        <p className="mt-1 text-xs leading-6 text-slate-700">
          SMECC2E is Funded by the European Union. Views and opinions expressed
          are however those of the author(s) only and do not necessarily reflect
          those of the European Union or the European Education and Culture
          Executive Agency (EACEA). Neither the European Union nor EACEA can be
          held responsible for them.
        </p>
      </div>
      </NomineeLetterPage>

      {/* Agreement PDF page 2 / document page 3 */}
      <NomineeLetterPage pageNumber={3} totalPages={pages}>
      <div className="text-center">
        <h3 className="text-base font-bold text-slate-900">
          Sustainable Energy &amp; Materials, Energy Policy, Climate Change,
          Energy Economics and Environment (SMECC2E)
        </h3>
        <p className="mt-2 text-base font-bold text-slate-900">
          {readOnly ? (
            <AutoValue
              value={fields.holderType}
              missingLabel="[Student/Staff/Trainee]"
            />
          ) : (
            <EditableSelect
              id="agreement-holder-type"
              label="Scholarship holder type"
              value={fields.holderType}
              options={NOMINEE_HOLDER_TYPE_OPTIONS}
              onChange={(value) => onFieldChange("holderType", value)}
              disabled={disabled}
              placeholder="Student/Staff/Trainee"
            />
          )}{" "}
          Scholarship Agreement
        </p>
      </div>

      <div className="border-t border-slate-300 pt-4">
        <p className="text-sm font-bold text-slate-900">
          <AutoValue
            value={fields.hostUniversity}
            missingLabel="[preferred host institution]"
          />
        </p>
        <p className="text-sm text-slate-800">
          <AutoValue
            value={auto.focalPersonAddress}
            missingLabel="[official address in full of preferred host institution]"
          />
        </p>
      </div>

      <Clause>
        Called hereafter &ldquo;the Host Institution&rdquo;, represented for the
        purposes of signature of this agreement by the project&apos;s contact
        person at the Host Institution,{" "}
        <AutoValue
          value={auto.focalPersonName}
          missingLabel="[name(s), forename(s) and function]"
        />
        ,
      </Clause>

      <Clause>of the one part, and</Clause>

      <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-x-4">
        <p className={detailLabelClass}>Mr/Ms</p>
        <p className="text-sm text-slate-800">
          <AutoValue
            value={applicantFullName}
            missingLabel="[first name] [surname]"
          />
        </p>

        <p className={detailLabelClass}>Date of birth:</p>
        <p className="text-sm text-slate-800">
          <AutoValue value={auto.dateOfBirth} />
        </p>

        <p className={detailLabelClass}>Nationality:</p>
        <p className="text-sm text-slate-800">
          <AutoValue value={auto.nationality} />
        </p>

        <p className={detailLabelClass}>Address:</p>
        <p className="text-sm text-slate-800">
          <AutoValue value={auto.homeAddress} />
        </p>

        <p className={detailLabelClass}>Phone:</p>
        <p className="text-sm text-slate-800">
          <AutoValue value={auto.phoneNumber} />
        </p>

        <p className={detailLabelClass}>E-mail:</p>
        <p className="text-sm text-slate-800">
          <EmailLink value={auto.applicantEmail} />
        </p>
      </div>

      <Clause>
        Called hereafter &ldquo;the scholarship holder&rdquo; of the other part,
      </Clause>

      <Clause>
        Have agreed the provisions below which form an integral part of this
        agreement (&ldquo;the agreement&rdquo;):
      </Clause>

      <ArticleHeading>1. The Agreement</ArticleHeading>

      <Clause>
        1.1 The Host Institution shall provide support to the scholarship holder
        for undertaking a mobility activity for{" "}
        {readOnly ? (
          <AutoValue
            value={fields.mobilityActivity}
            missingLabel="[mobility activity]"
          />
        ) : (
          <EditableSelect
            id="agreement-mobility-activity"
            label="Mobility activity"
            value={fields.mobilityActivity}
            options={NOMINEE_MOBILITY_ACTIVITY_OPTIONS}
            onChange={(value) => onFieldChange("mobilityActivity", value)}
            disabled={disabled}
            placeholder="Select mobility activity"
          />
        )}{" "}
        under the Intra-Africa Academic Mobility Scheme 2022-2027
        (NDICI-2024-MOBAF), in the framework of the project Number 101234492 -
        Sustainable Energy &amp; Materials, Energy Policy, Climate Change,
        Energy Economics and Environment (SMECC2E) Intra-Africa Mobility.
      </Clause>

      <Clause>
        1.2 The scholarship holder accepts the mobility conditions and the
        individual and travel support as specified in this agreement.
      </Clause>

      <Clause>
        1.3. Amendments to the agreement, including to the start and end dates,
        shall be requested and agreed by both parties through a normal
        notification by letter or by electronic message.
      </Clause>

      <Clause>
        1.4 The scholarship holder declares that they have not previously
        benefited from a student scholarship under the projects selected in the
        framework of the Intra-Africa Academic Mobility Scheme 2022-2027.
      </Clause>

      <Clause>
        1.5 The scholarship holder may NOT receive another EU-funded scholarship
        for the same mobility (i.e., during the full scholarship period)
      </Clause>

      <Clause>
        1.6 The scholarship holder commits to reimburse the financial support in
        case of incomplete or false declaration.
      </Clause>
      </NomineeLetterPage>

      {/* Agreement PDF page 3 / document page 4 */}
      <NomineeLetterPage pageNumber={4} totalPages={pages}>
      <Clause>
        1.7 The scholarship holder confirms and declare to meet the eligibility
        criteria for receiving the scholarship:
      </Clause>

      <Clause>1.7.1 For students (master and doctorate)</Clause>
      <ClauseList>
        <li>
          Be registered/admitted in or have obtained a degree (or equivalent)
          from one of the African beneficiaries HEIs (Target Group 1 students)
          or from another HEI, which is not participating as beneficiary but
          established in one of the eligible countries in Africa (target Group 2
          students)
        </li>
        <li>
          Not have already benefitted from another MOBAF 2022-2027 scholarship.
        </li>
      </ClauseList>

      <Clause>
        1.7.2. For trainees: be a student enrolled in a bachelor/master/PhD
        programme in one of the African beneficiary HEIs.
      </Clause>

      <Clause>
        1.7.3 For Staff: be working for one of the beneficiaries in the
        consortium.
      </Clause>

      <ArticleHeading>2. Details of the mobility</ArticleHeading>

      <div className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:gap-x-4">
        <p className={detailLabelClass}>Host University:</p>
        <p className="text-sm text-slate-800">
          <AutoValue value={fields.hostUniversity} />
        </p>

        <p className={detailLabelClass}>Host University Contact Person:</p>
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

        <p className={detailLabelClass}>Type of Mobility:</p>
        <p className="text-sm text-slate-800">
          {readOnly ? (
            <AutoValue value={fields.mobilityType} />
          ) : (
            <EditableInput
              id="agreement-mobility-type"
              label="Type of mobility"
              value={fields.mobilityType}
              onChange={(value) => onFieldChange("mobilityType", value)}
              disabled={disabled}
              placeholder="Type of mobility"
              width="18rem"
            />
          )}
        </p>

        <p className={detailLabelClass}>Area of study/work:</p>
        <p className="text-sm text-slate-800">
          {readOnly ? (
            <AutoValue value={fields.areaOfStudy} />
          ) : (
            <EditableInput
              id="agreement-area-of-study"
              label="Area of study or work"
              value={fields.areaOfStudy}
              onChange={(value) => onFieldChange("areaOfStudy", value)}
              disabled={disabled}
              placeholder="Proposed programme"
              width="18rem"
            />
          )}
        </p>

        <p className={detailLabelClass}>Maximum duration:</p>
        <p className="text-sm text-slate-800">
          {readOnly ? (
            <AutoValue value={fields.durationMonths} />
          ) : (
            <EditableInput
              id="agreement-duration"
              label="Maximum duration in months"
              value={fields.durationMonths}
              onChange={(value) => onFieldChange("durationMonths", value)}
              disabled={disabled}
              placeholder="e.g. 24"
              width="6rem"
            />
          )}{" "}
          months
        </p>

        <p className={detailLabelClass}>Mobility period start date:</p>
        <p className="text-sm text-slate-800">
          {readOnly ? (
            <AutoValue
              value={formatOptionalNomineeLetterDate(fields.mobilityStartDate)}
            />
          ) : (
            <EditableInput
              id="agreement-mobility-start"
              label="Mobility period start date"
              type="date"
              value={fields.mobilityStartDate}
              onChange={(value) => onFieldChange("mobilityStartDate", value)}
              disabled={disabled}
              width="11rem"
            />
          )}
        </p>

        <p className={detailLabelClass}>Mobility period end date:</p>
        <p className="text-sm text-slate-800">
          {readOnly ? (
            <AutoValue
              value={formatOptionalNomineeLetterDate(fields.mobilityEndDate)}
            />
          ) : (
            <EditableInput
              id="agreement-mobility-end"
              label="Mobility period end date"
              type="date"
              value={fields.mobilityEndDate}
              onChange={(value) => onFieldChange("mobilityEndDate", value)}
              disabled={disabled}
              width="11rem"
            />
          )}
        </p>

        <p className={detailLabelClass}>Target group (students only):</p>
        <p className="text-sm text-slate-800">
          {readOnly ? (
            <AutoValue value={fields.targetGroup} />
          ) : (
            <EditableSelect
              id="agreement-target-group"
              label="Target group"
              value={fields.targetGroup}
              options={NOMINEE_TARGET_GROUP_OPTIONS}
              onChange={(value) => onFieldChange("targetGroup", value)}
              disabled={disabled}
              placeholder="Select target group"
            />
          )}
        </p>
      </div>

      <ArticleHeading>3. Duration of the mobility/scholarship</ArticleHeading>

      <Clause>
        3.1 The maximum duration of the scholarship is stated in Art. 2. The
        total duration of the scholarship may not exceed the maximum duration
        nor the duration of the academic program itself.
      </Clause>

      <Clause>
        3.2 The mobility period start and end dates are stated in Article 2. The
        start date of the mobility period shall be the first day that the
        scholarship holder needs to be present at the Host University. The end
        date of the period abroad shall be the last day the scholarship holder
        needs to be present at the Host University.
      </Clause>

      <Clause>
        3.3 Demands to the institution to modify the duration should be
        introduced at least one month before the end of the originally planned
        mobility period. The mobility must respect the maximum duration foreseen
        by the Intra-Africa Programme, notably{" "}
        <AutoValue value={fields.durationMonths} /> months for{" "}
        <AutoValue value={fields.mobilityType} />.
      </Clause>

      <Clause>
        3.4 The Transcript of Records or Teaching/traineeship certificate or
        statement shall provide the confirmed start and end dates of the
        mobility period.
      </Clause>

      <ArticleHeading>
        4. Subsistence allowance and accommodation
      </ArticleHeading>

      <Clause>
        A monthly subsistence allowance will be provided to cover the costs
        during the mobility period. It also covers: (1) travel cost to and from
        the host institution, (2) visa costs, (3) accommodation, and (4)
        settling in costs. The monthly subsistence allowance depends entirely on
        the type of mobility and will be transferred on a regular (monthly)
        basis. It will be calculated as follows:
      </Clause>
      </NomineeLetterPage>

      {/* Agreement PDF page 4 / document page 5 */}
      <NomineeLetterPage pageNumber={5} totalPages={pages}>
      <ClauseList>
        <li>
          EUR 890 /month × <AutoValue value={fields.durationMonths} /> months
          for Masters degree seeking mobility
        </li>
        <li>
          EUR 890 /month × <AutoValue value={fields.durationMonths} /> months
          for Masters credit seeking mobility
        </li>
        <li>
          EUR 1,230 /month × <AutoValue value={fields.durationMonths} /> months
          for Doctoral credit-seeking mobility
        </li>
        <li>
          EUR 1,230 /month × <AutoValue value={fields.durationMonths} /> months
          for Degree seeking mobility
        </li>
        <li>
          EUR 1,230 /month × <AutoValue value={fields.durationMonths} /> months
          for Trainee mobility
        </li>
        <li>
          EUR 2,370 /month × <AutoValue value={fields.durationMonths} /> months
          for Staff mobility
        </li>
      </ClauseList>

      <Clause>
        For partial months, a pro-rata unit cost of 1/30 will be reimbursed for
        each day.
      </Clause>

      <ArticleHeading>
        5. Settling-in allowance: As indicated in Article 4 above under
        subsistence allowance and accommodation
      </ArticleHeading>

      <Clause>
        No extra monthly subsistence allowance will be provided upon arrival for
        covering settling-in costs.
      </Clause>

      <ArticleHeading>
        6. Travel arrangements, travel insurance &amp; visa costs
      </ArticleHeading>

      <Clause>
        6.1 The scholarship holder shall be responsible for finding an adequate
        travel agency, which will be responsible for organizing travels to and
        from the host country. The cost of travel from the home country to the
        host institution is built into the monthly subsistence allowance in
        Article 4.
      </Clause>

      <Clause>
        6.2 The scholarship holder shall recover his/her visa costs from the
        monthly subsistence allowance.
      </Clause>

      <Clause>
        6.3 The cost of travel from the host institution to the scholarship
        holder&apos;s home country, upon successful completion of the mobility
        period, shall be paid by the scholarship holder from his/her monthly
        subsistence allowance.
      </Clause>

      <Clause>
        6.4 The scholarship holders should arrive and leave the host university
        on dates as close as possible to those stated in Article 2 and provided
        by the Host University, within a margin of up to seven days.
      </Clause>

      <Clause>
        6.5 The Project Coordinator at the host institution will provide the
        scholarship holder with individual and travel support in a timely
        manner.
      </Clause>

      <Clause>
        <span className="font-bold text-slate-900">IMPORTANT:</span> The
        original travel documents (invoices, tickets, boarding passes, etc.)
        must be handed to the Host University.
      </Clause>

      <ArticleHeading>7. Payment arrangements</ArticleHeading>

      <Clause>
        7.1 The host institution shall be responsible for making the monthly
        payment of subsistence allowance.
      </Clause>

      <Clause>
        7.2 Payments to the scholarship holder shall be made to the bank account
        indicated by the scholarship holder upon arrival at the Host
        Institution. Payments shall be made in accordance with the policies of
        the Host University.
      </Clause>

      <Clause>
        7.3 Confirmation by the bank of the bank account details shall be
        provided to the Host University and to the Coordinating Institution. It
        should indicate:
      </Clause>

      <ClauseList>
        <li>Bank account where the financial support should be paid</li>
        <li>Bank account holder (if different than student)</li>
        <li>Bank name</li>
        <li>Clearing/BIC/SWIFT number</li>
        <li>Account/IBAN number</li>
      </ClauseList>
      </NomineeLetterPage>

      {/* Agreement PDF page 5 / document page 6 */}
      <NomineeLetterPage pageNumber={6} totalPages={pages}>
      <Clause>
        7.4 Any change of the bank account or the contact email of the
        scholarship holder during the stay abroad must to be communicated to the
        Host University contact person immediately.
      </Clause>

      <Clause>
        7.5 Payment shall be made in the local currency of host
        university/country on an amount equivalent to the euro allowance. The
        conversion to local currency of the allowance amounts indicated in EURO
        will be done at the exchange rate at which funds were paid to the
        university making the payment.
      </Clause>

      <Clause>
        7.6 The financial support may not be used to cover similar costs already
        funded by EU funds.
      </Clause>

      <Clause>
        7.7 The financial support or part thereof shall be repaid by the
        scholarship holder if she/he does not carry out the mobility activity in
        compliance with the terms of the agreement. If the scholarship holder
        terminates the agreement before it ends, he/she shall have to refund the
        amount of the grant already paid, except under the circumstances
        indicated in Art. 14.
      </Clause>

      <Clause>
        7.8 The financial support shall be repaid by the scholarship holder in
        case of fraud or false declaration. In case of any repayment obligation,
        the scholarship holder has 30 days upon return to the home country to
        carry out such reimbursement to the host Institution, following the
        instructions that will be provided. If the scholarship holder fails to
        do so, additional banking fees and interest may be charged or legal
        steps may be taken.
      </Clause>

      <ArticleHeading>8. Insurance</ArticleHeading>

      <Clause>
        8.1 The Host partner University will organize and pay full insurance
        coverage for the full length of the duration of the scholarship.
      </Clause>

      <Clause>
        8.2 Insurance Cover must take effect by the time the scholarship holder
        starts her/his journey to participate in the mobility and must be valid
        until one month after the end of the mobility.
      </Clause>

      <Clause>8.3 The cover includes:</Clause>

      <ClauseList>
        <li>
          sickness, pregnancy/childbirth and accident, in particular:
          <ul className="mt-1 list-[circle] space-y-1 pl-6">
            <li>direct payment of hospital stays</li>
            <li>
              reimbursement of outpatient care and other medical expenses
            </li>
            <li>
              at least 80% cover for doctor&apos;s fees, medicines, examinations
              and analyses prescribed by a physician, urgent dental care
              following an accident, all hospital expenses and surgical fees
              (including advances on hospital expenses), repatriation in the
              event of serious illness or accident
            </li>
            <li>
              costs for urgent dental care without accident up to 250 EUR per
              year
            </li>
            <li>non-permanent and non-chronic mental disorders</li>
            <li>
              pregnancies of less than 6 months (at the moment of departure from
              the home country to participate in the action) may not be excluded
              from cover
            </li>
          </ul>
        </li>
        <li>
          death (whether attributable to the activities under the action or not
          and covering all cases, including suicide), in particular:
          <ul className="mt-1 list-[circle] space-y-1 pl-6">
            <li>
              transport of the mortal remains to the place chosen by the
              deceased&apos;s family
            </li>
            <li>funeral and laying-out costs</li>
            <li>costs of the coffin</li>
          </ul>
        </li>
        <li>
          permanent invalidity (whether attributable to the activities under the
          action or not), in particular partial or full permanent disability
          resulting from an accident
        </li>
        <li>
          the entire mobility period (including the worldwide travel required
          for the participation).
        </li>
      </ClauseList>
      </NomineeLetterPage>

      {/* Agreement PDF page 6 / document page 7 */}
      <NomineeLetterPage pageNumber={7} totalPages={pages}>
      <Clause>
        8.4 It is the personal responsibility of the scholarship holder to
        assure insurance coverage for any period exceeding the official duration
        of the Intra-Africa Academic Mobility Scheme mobility/scholarship.
      </Clause>

      <ArticleHeading>
        9. Obligations upon arrival at the Host University
      </ArticleHeading>

      <Clause>
        9.1 The grantee is required to sign the{" "}
        {readOnly ? (
          <AutoValue
            value={fields.planDocument}
            missingLabel="[learning agreement/study plan/workplan/traineeship plan]"
          />
        ) : (
          <EditableSelect
            id="agreement-plan-document"
            label="Plan signed on arrival"
            value={fields.planDocument}
            options={NOMINEE_PLAN_DOCUMENT_OPTIONS}
            onChange={(value) => onFieldChange("planDocument", value)}
            disabled={disabled}
            placeholder="Select plan document"
          />
        )}{" "}
        immediately.
      </Clause>

      <Clause>
        9.2 The grantee must open a bank account and inform the Host University
        and the Coordinating Institution as indicated in Article 7.3.
      </Clause>

      <Clause>
        9.3 The contact person at the Host University has to sign a Confirmation
        of arrival form and send it immediately to the contact person at the
        Coordinating Institution <ProjectEmailLink /> as well as uploading it on
        the <PortalLink />.
      </Clause>

      <Clause>
        9.4 Scholarship holders must comply with the rules and regulations of
        the host institution.
      </Clause>

      <ArticleHeading>
        10. Tuition Fees [Article applicable only for doctoral candidates and
        master degree seeking students]
      </ArticleHeading>

      <Clause>
        10.1 At the home university: The scholarship holder will continue paying
        the registration/tuition fees at her/his Home University only if the
        mobility is less than or equal to 9 months.
      </Clause>

      <Clause>
        10.2 At the Host University: No tuition fees will be charged to the
        scholarship holder. If applicable, the Intra-Africa scholarship scheme
        will cover the costs of the participation fees at the Host University
        following the rules and regulations agreed by the partnership.
      </Clause>

      <ArticleHeading>
        11. Research costs [Article applicable only for doctoral candidates and
        for master students with research needs]
      </ArticleHeading>

      <Clause>
        11.1 The total amount available for research costs should be considered
        as a pool managed by the project coordinator at the host institution to
        cover the costs related to research activities of the scholarship
        holders on mobility.
      </Clause>

      <Clause>
        11.2 The project coordinator at the host institution will be responsible
        for ensuring that the research costs will be allocated to the student
        based on the real/actual research needs. A proposal for real/actual
        research costs shall be submitted to the host institution&apos;s project
        coordinator by each student, and in collaboration with the academic
        supervisor(s) for requesting the release of research costs.
      </Clause>

      <Clause>
        11.3 Research costs will not at any given time be paid directly to the
        scholarship holder.
      </Clause>

      <ArticleHeading>12. Academic commitment</ArticleHeading>
      </NomineeLetterPage>

      {/* Agreement PDF page 7 / document page 8 */}
      <NomineeLetterPage pageNumber={8} totalPages={pages}>
      <Clause>12.1 For Credit &amp; Degree Seeking Mobilities only:</Clause>

      <Clause>
        The scholarship holder must sign a{" "}
        <AutoValue
          value={fields.planDocument}
          missingLabel="Learning Agreement / Research Plan"
        />
        , as well as possible changes made to it. This document must be
        countersigned by:
      </Clause>

      <ClauseList>
        <li>
          the responsible person at the Home University (for credit seeking
          &amp; traineeship mobilities only)
        </li>
        <li>the responsible person at the Host University.</li>
      </ClauseList>

      <Clause>
        This document must be signed four weeks after the starting date of
        academic activities at the Host University at the latest, and a copy must
        be submitted by the Host University to the contact person at the
        Coordinating Institution via <ProjectEmailLink />, and also uploaded on
        the <PortalLink />.
      </Clause>

      <Clause>12.2 For Staff/Trainee Mobilities only:</Clause>

      <Clause>
        Staff scholarship holder must sign a{" "}
        <AutoValue
          value={fields.planDocument}
          missingLabel="Work Plan/Traineeship Plan"
        />{" "}
        (as applicable). This document must be countersigned by:
      </Clause>

      <ClauseList>
        <li>the responsible person at the Home University</li>
        <li>the responsible person at the Host University</li>
      </ClauseList>

      <Clause>
        This document must be signed Ten days after the starting date of
        academic activities at the Host University at the latest, and a copy must
        be submitted by the Host University to the contact person at the
        Coordinating Institution via <ProjectEmailLink />, and also uploaded on
        the <PortalLink />.
      </Clause>

      <ArticleHeading>13. Regular reports</ArticleHeading>

      <Clause>
        Regular progress reports will have to be submitted if the mobility flow
        is longer than one semester. In any case a final report will have to be
        submitted at the end of the mobility period.
      </Clause>

      <Clause>
        13.1 Progress report (for mobility flows longer than one semester)
      </Clause>

      <Clause>
        The first report is due after one semester and the subsequent reports are
        to be submitted at the end of the first and, if applicable, the second
        year. Each report is to be accompanied by a short standardized statement
        by the supervisor evaluating the scholarship holder&apos;s performance
        and, based on performance, recommending the renewal or termination of the
        scholarship. The reports will have to be sent to the contact person of
        the Coordinating Institution to <ProjectEmailLink />, and also uploaded
        on the <PortalLink />.
      </Clause>

      <Clause>13.2 Final report</Clause>

      <Clause>
        At the end of the mobility period at the Host University, each
        scholarship holder has to prepare a detailed final report which has to be
        submitted with the written consent of the academic supervisor and the
        official contact person at the Host University to the Project
        Coordination Committee <ProjectEmailLink />, and also uploaded on the{" "}
        <PortalLink />.
      </Clause>

      <Clause>
        13.3 The scholarship holder must inform the consortium of any events or
        circumstances likely to affect the Agreement as soon as possible.
      </Clause>

      <Clause>
        13.4 The scholarship holder also has the obligation to participate in
        periodic evaluations and/or surveys conducted by the consortium.
      </Clause>

      </NomineeLetterPage>

      {/* Agreement PDF page 8 / document page 9 */}
      <NomineeLetterPage pageNumber={9} totalPages={pages}>
      <ArticleHeading>
        14. Interruption of the mobility or withdrawal from the scholarship
      </ArticleHeading>

      <Clause>
        14.1 The mobility period must be fully respected; it is not possible to
        divide the duration of stay foreseen by the project. The student mobility
        periods can only be interrupted if the student has to temporarily suspend
        the academic activities at the host institutions for duly justified and
        well documented personal reasons (e.g. serious illness, parent loss,
        etc.) or academic reasons (e.g. research activities abroad).
      </Clause>

      <Clause>
        14.2 Any absence from host programme activities must be duly justified to
        the SMECC2E contact person at the host institution (e.g. a statement from
        a medical professional), with a copy to the Coordination Office.
      </Clause>

      <Clause>
        14.3 Suspension/interruption for personal reasons: the scholarship
        payment will be interrupted until the scholarship holder has resumed the
        academic activities at the host institution. However, if despite the
        temporary absence the scholarship holder can catch up on the
        study/research activities without needing to extend the originally agreed
        scholarship duration, the monthly allowances corresponding to the period
        of interruption could be paid to the student upon agreement of the
        partnership.
      </Clause>

      <Clause>
        14.4 If the scholarship holder cannot catch up because of serious and
        justified reasons, her/his absence might lead to an extension of the
        mobility duration, within the maximum eligible duration for this type of
        mobility (see Article 3.3 of this agreement).
      </Clause>

      <Clause>
        14.5 Suspension/interruption for academic reasons: academic grounds may
        justify an interruption of a period of mobility, for instance to allow a
        student to study or carry out research activities for a short period of
        time abroad (e.g. in his/her home country or any other institution
        outside the partnership). However, in this case, the scholarship will not
        be paid during the period of interruption.
      </Clause>

      <Clause>
        14.6 The compulsory/institutional breaks in the academic calendar and the
        scholarship holders&apos; holiday rights are not considered as
        suspension/interruption and are not concerned by the above provisions.
      </Clause>

      <Clause>
        14.7 Early termination: If the scholarship holder withdraws during the
        mobility, the payment of the subsistence allowance is stopped at the time
        of termination.
      </Clause>

      <ArticleHeading>
        15. Obligations before leaving the Host University
      </ArticleHeading>

      <Clause>
        15.1 Scholarship holders must complete successfully their mobility period
        at the host institution as follows:
      </Clause>

      <ClauseList>
        <li>
          Degree-seeking mobility: all courses and research requirements must be
          met according to the rules and regulations of the host institution.
        </li>
      </ClauseList>

      <Clause>
        15.2 The following documents need to be submitted to the contact person
        at the host institution and to the contact person at the project
        Coordinating Institution (<ProjectEmailLink />) and also uploaded on the{" "}
        <PortalLink /> at the end of mobility:
      </Clause>

      <ol className="list-[lower-alpha] space-y-1 pl-8 text-sm leading-7 text-slate-800">
        <li>Final Report</li>
        <li>
          Confirmation of arrival and departure duly completed and signed by the
          official contact person at the Host University
        </li>
        <li>
          Confirmation of Payment / Confirmation of Participation signed by the
          scholarship holder
        </li>
        <li>
          For students/Trainees: Updated and signed Learning Agreement or
          Study/Research/Traineeship Plan (only if changes occurred after the
          start of mobility), transcript of records and copy of the degree
          awarded (for degree seeking mobility only)
        </li>
        <li>
          For staff: updated and signed Study/Research/Work Plan (only if changes
          occurred since the start of mobility)
        </li>
      </ol>

      </NomineeLetterPage>

      {/* Agreement PDF page 9 / document page 10 */}
      <NomineeLetterPage pageNumber={10} totalPages={pages}>
      <Clause>
        15.3 The scholarship holder is obliged to submit, within 30 days of the
        end of the mobility period, an evaluation form provided online by the
        Coordinating Institution
      </Clause>

      <ArticleHeading>16. Treatment of personal data</ArticleHeading>

      <Clause>
        The European Education and Culture Executive Agency (EACEA), in the
        context of managing the Intra-Africa Academic Mobility Scheme, collects
        and processes the personal data of some of the candidates. In particular,
        certain data of the scholarship holders is shared with the Agency through
        the mobility tool under EU Funding and Tenders Portal and treated
        according to the following{" "}
        <a
          href={PRIVACY_STATEMENT_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-700 underline"
        >
          privacy statement
        </a>
        .
      </Clause>

      <ArticleHeading>17. Complaints and Redress</ArticleHeading>

      <Clause>
        17.1 Right to submit a complaint: The scholarship holder has the right to
        submit a complaint concerning any academic, administrative, financial,
        welfare, accommodation, insurance, mobility, supervision, discrimination,
        harassment, misconduct, data-protection, or other matter arising from the
        implementation of this Agreement or participation in the SMECC2E mobility
        programme. Complaints shall be handled fairly, promptly, confidentially,
        impartially, and without retaliation against the complainant.
      </Clause>

      <Clause>
        17.2 Submission and registration of complaints: All complaints must be
        formally submitted and logged through the grievance menu on the Scholars
        management module of the <PortalLink />.
      </Clause>

      <Clause>The complaint should contain, as applicable:</Clause>

      <ol className="list-[lower-alpha] space-y-1 pl-8 text-sm leading-7 text-slate-800">
        <li>the name and contact details of the scholarship holder;</li>
        <li>the Host Institution and type of mobility concerned;</li>
        <li>
          a clear description of the complaint, including relevant dates,
          persons, decisions, or events;
        </li>
        <li>any supporting documents or evidence;</li>
        <li>any steps already taken to resolve the matter; and</li>
        <li>the remedy or action requested by the scholarship holder.</li>
      </ol>

      <Clause>
        Complaints should normally be submitted within fourteen (14) calendar
        days of the event, decision, or circumstance giving rise to the
        complaint, or within fourteen calendar days of the date on which the
        scholarship holder reasonably became aware of the matter.
      </Clause>

      <Clause>
        Where the scholarship holder is unable to access the SMECC2E Integrated
        Portal, the complaint may initially be submitted by email to the Host
        Institution&apos;s focal person. The focal person shall ensure that the
        complaint is entered into the SMECC2E Integrated Portal within five (5)
        working days. Complaints involving an immediate risk to health, safety,
        security, or welfare shall be reported without delay.
      </Clause>

      <Clause>
        17.3 Acknowledgement and complaint reference number - The scholarship
        holder shall receive an acknowledgement of the complaint within five (5)
        working days of its submission. The acknowledgement shall include the
        complaint reference number, the person responsible for handling the
        complaint, the applicable review level, and the expected timeframe for a
        response.
      </Clause>

      </NomineeLetterPage>

      {/* Agreement PDF page 10 / document page 11 */}
      <NomineeLetterPage pageNumber={11} totalPages={pages}>
      <Clause>
        17.4 Level One: Review by the Host Institution - The complaint shall
        first be addressed internally at the Host Institution. It shall be
        directed through the SMECC2E Integrated Portal to:
      </Clause>

      <div className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:gap-x-4">
        <p className={detailLabelClass}>Host Institution Focal Person:</p>
        <p className="text-sm text-slate-800">
          <AutoValue
            value={auto.focalPersonName}
            missingLabel="No focal person set for this institution"
          />
        </p>

        <p className={detailLabelClass}>Email:</p>
        <p className="text-sm text-slate-800">
          <EmailLink
            value={auto.focalPersonEmail}
            missingLabel="No focal person e-mail"
          />
        </p>
      </div>

      <Clause>The Host Institution focal person shall:</Clause>

      <ol className="list-[lower-alpha] space-y-1 pl-8 text-sm leading-7 text-slate-800">
        <li>review the complaint and supporting evidence;</li>
        <li>
          consult the relevant academic, administrative, financial, welfare, or
          institutional unit, where necessary;
        </li>
        <li>
          provide the scholarship holder with an opportunity to present
          additional information;
        </li>
        <li>
          ensure that any person who is directly involved in the subject of the
          complaint does not make the final decision on it; and
        </li>
        <li>
          issue a written decision stating the findings, action taken, proposed
          remedy, and available escalation procedure on the SMECC2E portal.
        </li>
      </ol>

      <Clause>
        The Host Institution shall normally communicate its written decision
        within ten (10) working days of acknowledging the complaint. Where
        additional investigation is required, this period may be extended by a
        maximum of ten (10) additional working days. The scholarship holder shall
        be informed through the SMECC2E Integrated Portal of the reason for the
        extension and the revised decision date.
      </Clause>

      <Clause>
        17.5 Level Two: Review by the SMECC2E Project Coordinating Committee -
        Where the scholarship holder is dissatisfied with the Level One decision,
        or where the Host Institution has not responded within the prescribed
        timeframe, the scholarship holder may escalate the complaint through the
        SMECC2E Integrated Portal to the Coordinating Institution within ten (10)
        working days of receiving the Level One decision or of the expiry of the
        applicable response period.
      </Clause>

      <Clause>The Level Two complaint shall be addressed to:</Clause>

      <div className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:gap-x-4">
        <p className={detailLabelClass}>SMECC2E Coordinating Institution:</p>
        <p className="text-sm text-slate-800">University of Nigeria</p>

        <p className={detailLabelClass}>SMECC2E Project Coordinator:</p>
        <p className="text-sm text-slate-800">Dr. Patrick Udeme-obong Akpan</p>

        <p className={detailLabelClass}>Email:</p>
        <p className="text-sm text-slate-800">
          <ProjectEmailLink />
        </p>

        <p className={detailLabelClass}>Copy:</p>
        <p className="text-sm text-slate-800">
          <EmailLink value={COORDINATOR_EMAIL} />
        </p>
      </div>

      <Clause>
        The scholarship holder shall provide the original complaint reference
        number, the Level One decision where available, the reasons for
        dissatisfaction with that decision, and any additional supporting
        evidence.
      </Clause>

      <Clause>
        The Coordinating Institution shall conduct an impartial review of the
        complaint and may request information from the scholarship holder, the
        Host Institution, the Home Institution, or any other relevant party.
        Where appropriate, the matter may be referred to the SMECC2E Project
        Management Unit, Quality Assurance Committee, Scholarship Selection
        Committee, or another competent project body, provided that no person
        with a conflict of interest participates in the decision.
      </Clause>

      <Clause>
        A written Level Two decision shall normally be issued through the SMECC2E
        Integrated Portal within fifteen (15) working days of acknowledgement.
        Where the matter is complex and additional time is required, the review
        period may be extended by a maximum of ten (10) additional working days,
        with reasons communicated to the scholarship holder.
      </Clause>

      <Clause>The Level Two decision shall state:</Clause>

      <ol className="list-[lower-alpha] space-y-1 pl-8 text-sm leading-7 text-slate-800">
        <li>the matters reviewed;</li>
        <li>the findings and reasons for the decision;</li>
        <li>
          any corrective, protective, financial, academic, or administrative
          action to be taken;
        </li>
        <li>
          the responsible person or institution and implementation timeframe; and
        </li>
        <li>the procedure for any further escalation.</li>
      </ol>

      </NomineeLetterPage>

      {/* Agreement PDF page 11 / document page 12 */}
      <NomineeLetterPage pageNumber={12} totalPages={pages}>
      <Clause>
        17.6 Level 3: Escalation to the European Union - A complaint may be
        escalated to the relevant European Union service only after the complaint
        has been considered at both:
      </Clause>

      <ClauseList>
        <li>Level One – the Host Institution; and</li>
        <li>Level Two – the SMECC2E Coordinating Committee.</li>
      </ClauseList>

      <Clause>
        Where the scholarship holder remains dissatisfied after receiving the
        Level Two decision, the scholarship holder may refer the matter to the
        relevant service of the European Education and Culture Executive Agency
        or other competent European Union authority, in accordance with the
        SMECC2E Grant Agreement and the official European Union complaints
        procedures.
      </Clause>

      <Clause>
        Such escalation should normally be made within thirty (30) calendar days
        of receipt of the Level Two decision and should include:
      </Clause>

      <ol className="list-[lower-alpha] space-y-1 pl-8 text-sm leading-7 text-slate-800">
        <li>the SMECC2E complaint reference number;</li>
        <li>the original complaint;</li>
        <li>the Level One and Level Two decisions;</li>
        <li>relevant supporting documents; and</li>
        <li>
          a clear explanation of why the internal resolution is considered
          unsatisfactory.
        </li>
      </ol>

      <Clause>
        Referral to the European Union shall not automatically suspend the
        implementation of the Level Two decision unless the competent European
        Union authority directs otherwise.
      </Clause>

      </NomineeLetterPage>

      {/* Agreement PDF page 12 / document page 13 */}
      <NomineeLetterPage pageNumber={13} totalPages={pages}>
      <Clause>
        17.7 Confidentiality, data protection and non-retaliation - All
        complaints shall be handled with appropriate confidentiality and in
        accordance with applicable data-protection requirements. Information
        shall be shared only with persons who require it for the assessment,
        investigation, resolution, monitoring, or reporting of the complaint.
      </Clause>

      <Clause>
        No scholarship holder shall be subjected to intimidation, disadvantage,
        reduction or suspension of scholarship benefits, adverse academic
        treatment, discrimination, or retaliation for submitting a complaint in
        good faith or participating in a complaint investigation. A complaint
        submitted maliciously or containing information known to be false may be
        addressed under the applicable disciplinary procedures.
      </Clause>

      <Clause>
        17.8 Records, monitoring and implementation of redress - All complaints,
        correspondence, supporting documents, decisions, agreed remedies,
        implementation actions, and closure dates shall be retained in the
        SMECC2E Integrated Portal to ensure an auditable decision trail. The
        responsible institution shall update the portal when corrective or
        remedial action has been completed. The scholarship holder shall be
        notified of the implementation and closure of the complaint. An
        anonymised summary of complaints, response times, outcomes, and
        corrective actions may be used by the SMECC2E Project Management Unit for
        quality assurance, risk management, institutional learning, and
        reporting, without disclosing the complainant&apos;s identity.
      </Clause>

      <Clause>
        17.9 Other rights and urgent matters - This complaints procedure does not
        prevent a scholarship holder from obtaining emergency medical, security,
        safeguarding, legal, or other appropriate assistance where there is an
        immediate threat to health, safety, or welfare. It also does not remove
        any rights available under the applicable national law, institutional
        regulations, the SMECC2E Grant Agreement, or European Union rules.
      </Clause>

      <Clause>
        We undersigned, parties of the present agreement, hereby confirm to have
        carefully read, be fully aware of and accept the provisions laid down in
        the present agreement.
      </Clause>

      <ArticleHeading>Signatures</ArticleHeading>

      <div className="space-y-6 pt-2">
        <div className="space-y-2">
          <p className="text-sm text-slate-800">
            <span className={detailLabelClass}>
              Name of scholarship holder:
            </span>{" "}
            <AutoValue
              value={applicantFullName}
              missingLabel="[name of applicant]"
            />
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-2">
            <SignatureLine label="Date" />
            <SignatureLine label="Signature of the scholarship holder" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-800">
            <span className={detailLabelClass}>
              Name of the Contact person of the Host University:
            </span>{" "}
            <AutoValue
              value={auto.focalPersonName}
              missingLabel="[name of focal person]"
            />
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-2">
            <SignatureLine label="Date" />
            <SignatureLine label="Signature of the contact person of the Host University" />
          </div>
        </div>
      </div>
      </NomineeLetterPage>
    </>
  );
}
