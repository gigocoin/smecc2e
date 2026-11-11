"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that the information provided is accurate and reflects my academic progress.";

const THEMATIC_OPTIONS = [
  ["sustainable_energy", "Sustainable Energy"],
  ["sustainable_materials", "Sustainable Materials"],
  ["energy_economics_finance", "Energy Economics-Finance"],
  ["energy_policy_environment_climate", "Energy Policy, Environment/Climate Change"],
] as const;

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type ActivityStatus = "" | "completed" | "ongoing" | "yet_to_start";
type SelfAssessment = "" | "excellent" | "very_good" | "good" | "needs_improvement";
type ThematicKey = (typeof THEMATIC_OPTIONS)[number][0];

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type ActivityRow = {
  id: string;
  activity: string;
  description: string;
  status: ActivityStatus;
  creditsOutput: string;
};

type ChallengeRow = {
  id: string;
  challenge: string;
  impact: string;
  actionTaken: string;
};

type FuturePlanRow = {
  id: string;
  activities: string;
  expectedOutcomes: string;
};

type FormState = {
  cohort: Cohort;
  homeInstitution: string;
  thematicAreas: ThematicKey[];
  reportingDate: string;
  activities: ActivityRow[];
  progressSummary: string;
  technicalSkills: string;
  researchSkills: string;
  professionalSkills: string;
  gradesObtained: string;
  researchOutputs: string;
  internshipDeliverables: string;
  challenges: ChallengeRow[];
  thematicAlignment: string;
  academicSupport: string;
  facilitiesInfrastructure: string;
  supervisionQuality: string;
  futurePlans: FuturePlanRow[];
  selfAssessment: SelfAssessment;
  selfAssessmentComments: string;
  evidenceAttached: boolean;
  evidenceFileName: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newActivity(): ActivityRow {
  return {
    id: newId(),
    activity: "",
    description: "",
    status: "",
    creditsOutput: "",
  };
}

function newChallenge(): ChallengeRow {
  return {
    id: newId(),
    challenge: "",
    impact: "",
    actionTaken: "",
  };
}

function newFuturePlan(): FuturePlanRow {
  return {
    id: newId(),
    activities: "",
    expectedOutcomes: "",
  };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  homeInstitution: "",
  thematicAreas: [],
  reportingDate: "",
  activities: [newActivity()],
  progressSummary: "",
  technicalSkills: "",
  researchSkills: "",
  professionalSkills: "",
  gradesObtained: "",
  researchOutputs: "",
  internshipDeliverables: "",
  challenges: [newChallenge()],
  thematicAlignment: "",
  academicSupport: "",
  facilitiesInfrastructure: "",
  supervisionQuality: "",
  futurePlans: [newFuturePlan()],
  selfAssessment: "",
  selfAssessmentComments: "",
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

function mobilityKind(type: string): string {
  if (/staff/i.test(type)) return "Staff";
  if (/trainee/i.test(type)) return "Traineeship";
  if (/credit/i.test(type)) return "Credit-Seeking";
  if (/degree/i.test(type)) return "Degree-Seeking";
  return pending(type);
}

function storageKey(applicationId: string): string {
  return `smecc2e.progress-report-mid-term.${applicationId}`;
}

export function ProgressReportMidTermForm({
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
      const home = applicantHomeInstitution({
        masterProgrammeUniversity: app?.masterProgrammeUniversity,
        bachelorProgrammeUniversity: app?.bachelorProgrammeUniversity,
      });
      if (!raw) {
        setForm({
          ...EMPTY_FORM,
          activities: [newActivity()],
          challenges: [newChallenge()],
          futurePlans: [newFuturePlan()],
          homeInstitution: home === "—" ? "" : home,
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        activities:
          parsed.activities && parsed.activities.length > 0
            ? parsed.activities
            : [newActivity()],
        challenges:
          parsed.challenges && parsed.challenges.length > 0
            ? parsed.challenges
            : [newChallenge()],
        futurePlans:
          parsed.futurePlans && parsed.futurePlans.length > 0
            ? parsed.futurePlans
            : [newFuturePlan()],
        thematicAreas: parsed.thematicAreas ?? [],
        homeInstitution:
          parsed.homeInstitution || (home === "—" ? "" : home),
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        activities: [newActivity()],
        challenges: [newChallenge()],
        futurePlans: [newFuturePlan()],
      });
    }
  }, [
    applicationId,
    app?.bachelorProgrammeUniversity,
    app?.masterProgrammeUniversity,
  ]);

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

  const toggleThematic = (area: ThematicKey) => {
    if (saved) return;
    update({
      thematicAreas: form.thematicAreas.includes(area)
        ? form.thematicAreas.filter((item) => item !== area)
        : [...form.thematicAreas, area],
    });
  };

  const updateActivity = (id: string, patch: Partial<ActivityRow>) => {
    update({
      activities: form.activities.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const updateChallenge = (id: string, patch: Partial<ChallengeRow>) => {
    update({
      challenges: form.challenges.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const updateFuturePlan = (id: string, patch: Partial<FuturePlanRow>) => {
    update({
      futurePlans: form.futurePlans.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const sign = () => {
    if (saved) return;
    if (form.thematicAreas.length === 0) {
      setError("Select at least one thematic area.");
      return;
    }
    if (!form.reportingDate) {
      setError("Enter the reporting date.");
      return;
    }
    if (!form.progressSummary.trim()) {
      setError("Enter the progress summary.");
      return;
    }
    if (!form.selfAssessment) {
      setError("Select an overall self-assessment rating.");
      return;
    }
    if (!form.declared) {
      setError("Confirm the student declaration before you sign.");
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
          <h1 className="mt-3 text-lg font-bold tracking-wide sm:text-xl">
            Student / staff progress report (mid-term)
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Primary user: Scholar / Staff / Trainee / Host supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Replace the generic progress report with the approved SMECC2E Annex A
          structure.
        </p>

        <p className="text-sm font-bold uppercase tracking-wide text-[#062763]">
          A. Student / staff progress report (filled by scholar)
        </p>

        <FormTable title="A1. General information">
          <ReadRow label="Full names" value={fullName} />
          <ReadRow
            label="Nationality"
            value={pending(letter?.nationality || app?.nationality)}
          />
          <ReadRow
            label="Mobility category"
            value={mobilityCategory(mobilitySource)}
          />
          <ReadRow
            label="Mobility start date"
            value={pending(letter?.startDate)}
          />
          <ReadRow
            label="Mobility end date"
            value={pending(letter?.endDate)}
          />
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="progress-mid-cohort"
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
          <ReadRow
            label="Programme type"
            value={mobilityCategory(mobilitySource)}
          />
          <ReadRow label="Mobility type" value={mobilityKind(mobilitySource)} />
          <TextRow
            label="Home institution"
            value={form.homeInstitution}
            disabled={saved}
            onChange={(homeInstitution) => update({ homeInstitution })}
          />
          <ReadRow
            label="Host institution/organisation"
            value={pending(letter?.host || app?.preferredHostInstitution)}
          />
          <ChoiceRow label="Thematic area (select as many as are applicable)">
            <div className="flex flex-col gap-2">
              {THEMATIC_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.thematicAreas.includes(value)}
                    disabled={saved}
                    onChange={() => toggleThematic(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </ChoiceRow>
          <ReadRow label="Reporting period" value="Mid-Term" />
          <TextRow
            label="Reporting date"
            type="date"
            value={form.reportingDate}
            disabled={saved}
            onChange={(reportingDate) => update({ reportingDate })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            A2. Academic & training activities
          </h2>
          <p className="mt-3 px-1 text-sm font-semibold text-[#062763]">
            1. Courses / research / training undertaken
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="border border-slate-300 px-2 py-2">Activity</th>
                  <th className="border border-slate-300 px-2 py-2">
                    Description
                  </th>
                  <th className="border border-slate-300 px-2 py-2">Status</th>
                  <th className="border border-slate-300 px-2 py-2">
                    Credits / Output
                  </th>
                  <th className="border border-slate-300 px-2 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {form.activities.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="text"
                        value={row.activity}
                        disabled={saved}
                        onChange={(event) =>
                          updateActivity(row.id, {
                            activity: event.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="text"
                        value={row.description}
                        disabled={saved}
                        onChange={(event) =>
                          updateActivity(row.id, {
                            description: event.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <select
                        value={row.status}
                        disabled={saved}
                        onChange={(event) =>
                          updateActivity(row.id, {
                            status: event.target.value as ActivityStatus,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                      >
                        <option value="">—</option>
                        <option value="completed">Completed</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="yet_to_start">Yet to start</option>
                      </select>
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      <input
                        type="text"
                        value={row.creditsOutput}
                        disabled={saved}
                        onChange={(event) =>
                          updateActivity(row.id, {
                            creditsOutput: event.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      {!saved && form.activities.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            update({
                              activities: form.activities.filter(
                                (item) => item.id !== row.id
                              ),
                            })
                          }
                          className="text-sm font-semibold text-slate-600 hover:text-[#062763]"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!saved && (
            <button
              type="button"
              onClick={() =>
                update({ activities: [...form.activities, newActivity()] })
              }
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another activity
            </button>
          )}
        </section>

        <FormTable title="2. Progress summary">
          <TextRow
            label="Provide a summary of your academic, research, or traineeship progress"
            value={form.progressSummary}
            disabled={saved}
            multiline
            rows={5}
            onChange={(progressSummary) => update({ progressSummary })}
          />
        </FormTable>

        <FormTable title="3. Skills and competencies acquired">
          <TextRow
            label="Technical skills"
            value={form.technicalSkills}
            disabled={saved}
            multiline
            onChange={(technicalSkills) => update({ technicalSkills })}
          />
          <TextRow
            label="Research skills"
            value={form.researchSkills}
            disabled={saved}
            multiline
            onChange={(researchSkills) => update({ researchSkills })}
          />
          <TextRow
            label="Professional/soft skills"
            value={form.professionalSkills}
            disabled={saved}
            multiline
            onChange={(professionalSkills) => update({ professionalSkills })}
          />
        </FormTable>

        <FormTable title="A3. Performance and achievements">
          <TextRow
            label="Grades obtained (if applicable)"
            value={form.gradesObtained}
            disabled={saved}
            multiline
            onChange={(gradesObtained) => update({ gradesObtained })}
          />
          <TextRow
            label="Research outputs (publications, reports, presentations)"
            value={form.researchOutputs}
            disabled={saved}
            multiline
            onChange={(researchOutputs) => update({ researchOutputs })}
          />
          <TextRow
            label="Internship deliverables (if applicable)"
            value={form.internshipDeliverables}
            disabled={saved}
            multiline
            onChange={(internshipDeliverables) =>
              update({ internshipDeliverables })
            }
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              A4. Challenges
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">Challenge</th>
                <th className="border border-slate-300 px-2 py-2">Impact</th>
                <th className="border border-slate-300 px-2 py-2">
                  Action taken
                </th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.challenges.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.challenge}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateChallenge(row.id, {
                          challenge: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.impact}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateChallenge(row.id, { impact: event.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.actionTaken}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateChallenge(row.id, {
                          actionTaken: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.challenges.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            challenges: form.challenges.filter(
                              (item) => item.id !== row.id
                            ),
                          })
                        }
                        className="text-sm font-semibold text-slate-600 hover:text-[#062763]"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!saved && (
            <button
              type="button"
              onClick={() =>
                update({ challenges: [...form.challenges, newChallenge()] })
              }
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another challenge
            </button>
          )}
        </section>

        <FormTable title="A5. Alignment with SMECC2E thematic area">
          <TextRow
            label="Explain how your activities align with the selected thematic area"
            value={form.thematicAlignment}
            disabled={saved}
            multiline
            rows={4}
            onChange={(thematicAlignment) => update({ thematicAlignment })}
          />
        </FormTable>

        <FormTable title="A6. Feedback on host institution / organization">
          <TextRow
            label="Academic support"
            value={form.academicSupport}
            disabled={saved}
            multiline
            onChange={(academicSupport) => update({ academicSupport })}
          />
          <TextRow
            label="Facilities and infrastructure"
            value={form.facilitiesInfrastructure}
            disabled={saved}
            multiline
            onChange={(facilitiesInfrastructure) =>
              update({ facilitiesInfrastructure })
            }
          />
          <TextRow
            label="Supervision quality"
            value={form.supervisionQuality}
            disabled={saved}
            multiline
            onChange={(supervisionQuality) => update({ supervisionQuality })}
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              A7. Future plan (for mid-term report only)
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">Activities</th>
                <th className="border border-slate-300 px-2 py-2">
                  Expected outcomes
                </th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.futurePlans.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.activities}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateFuturePlan(row.id, {
                          activities: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.expectedOutcomes}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateFuturePlan(row.id, {
                          expectedOutcomes: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.futurePlans.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            futurePlans: form.futurePlans.filter(
                              (item) => item.id !== row.id
                            ),
                          })
                        }
                        className="text-sm font-semibold text-slate-600 hover:text-[#062763]"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!saved && (
            <button
              type="button"
              onClick={() =>
                update({ futurePlans: [...form.futurePlans, newFuturePlan()] })
              }
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another planned activity
            </button>
          )}
          <p className="mt-2 px-1 text-sm text-slate-600">
            Outline your remaining activities and expected outcomes.
          </p>
        </section>

        <FormTable title="A8. Overall self-assessment">
          <ChoiceRow label="Rating">
            <RadioGroup
              name="progress-mid-self-assessment"
              value={form.selfAssessment}
              disabled={saved}
              onChange={(selfAssessment) =>
                update({ selfAssessment: selfAssessment as SelfAssessment })
              }
              options={[
                ["excellent", "Excellent"],
                ["very_good", "Very Good"],
                ["good", "Good"],
                ["needs_improvement", "Needs Improvement"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Comments"
            value={form.selfAssessmentComments}
            disabled={saved}
            multiline
            onChange={(selfAssessmentComments) =>
              update({ selfAssessmentComments })
            }
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            A9. Evidence photographs
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            Please attach/paste captioned photographs of evidences/activities
            carried out during the period.
          </p>
          <div className="mt-3 space-y-3 px-1">
            <AttachmentRow
              label="Captioned photographs of evidences/activities"
              checked={form.evidenceAttached}
              fileName={form.evidenceFileName}
              disabled={saved}
              onCheckedChange={(evidenceAttached) =>
                update({
                  evidenceAttached,
                  evidenceFileName: evidenceAttached
                    ? form.evidenceFileName
                    : "",
                })
              }
              onFileNameChange={(evidenceFileName) =>
                update({ evidenceAttached: true, evidenceFileName })
              }
            />
          </div>
        </section>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            A10. Student declaration
          </h2>
          <label className="mt-3 flex items-start gap-3 px-1 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={form.declared}
              disabled={saved}
              onChange={(event) => update({ declared: event.target.checked })}
              className="mt-1"
            />
            <span>{DECLARATION}</span>
          </label>
        </section>

        <SignTable
          title="Scholar signature"
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
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
          ]}
        />
        <SignTable
          title="Viewed by"
          rows={[
            {
              role: "Host Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Home Supervisor",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Host Finance Officer",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Coordinator",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Quality Assurance Officer",
              name: "Pending",
              signature: "Pending",
              date: "Pending",
            },
            {
              role: "Scholar",
              name: fullName,
              signature: form.signature || "Pending",
              date: form.signedAt || "Pending",
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
            Mid-term progress report signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign mid-term progress report"}
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
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <ChoiceRow label={label}>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
      ) : (
        <input
          type={type}
          value={value}
          disabled={disabled}
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
