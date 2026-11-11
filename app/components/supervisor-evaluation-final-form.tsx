"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplicantSessionUser } from "@/lib/applicant-auth-service";
import { applicantHomeInstitution } from "@/lib/interview-scoring-sheet";

const GRANT_LINE =
  "EU Project / Grant Agreement No.: 101234492 | EU Framework: NDICI-2024-MOBAF Intra-Africa Academic Mobility Scheme";

const DECLARATION =
  "I confirm that this evaluation reflects the participant’s performance during the reporting period.";

type Cohort = "cohort-1" | "cohort-2" | "cohort-3";
type ProgrammeType = "" | "masters" | "phd" | "trainee";
type Rating = "" | "0" | "1" | "2" | "3" | "4" | "5";
type ObjectiveStatus = "" | "yes" | "on_going" | "not_started";
type OverallPerformance =
  | ""
  | "excellent"
  | "very_good"
  | "good"
  | "needs_improvement";
type Recommendation =
  | ""
  | "continue_as_planned"
  | "minor_adjustments"
  | "major_intervention";

type LetterFields = {
  host: string;
  mobilityType: string;
  startDate: string;
  endDate: string;
  nationality: string;
};

type ObjectiveRow = {
  id: string;
  description: string;
  status: ObjectiveStatus;
  comments: string;
};

type ChallengeRow = {
  id: string;
  issue: string;
  impact: string;
  recommendations: string;
};

type FormState = {
  cohort: Cohort;
  programmeType: ProgrammeType;
  supervisorName: string;
  reportingDate: string;
  academicCompetence: Rating;
  progressOutput: Rating;
  qualityOfWork: Rating;
  initiativeIndependence: Rating;
  communicationSkills: Rating;
  professionalConduct: Rating;
  mastersCoursePerformance: string;
  mastersAssignmentQuality: string;
  phdResearchProgress: string;
  phdResearchQuality: string;
  phdPublicationPotential: string;
  traineePracticalSkills: string;
  traineeIndustryReadiness: string;
  traineeWorkplaceIntegration: string;
  objectives: ObjectiveRow[];
  overallPerformance: OverallPerformance;
  challenges: ChallengeRow[];
  recommendation: Recommendation;
  finalRemarks: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const RATING_CRITERIA: {
  key: keyof Pick<
    FormState,
    | "academicCompetence"
    | "progressOutput"
    | "qualityOfWork"
    | "initiativeIndependence"
    | "communicationSkills"
    | "professionalConduct"
  >;
  label: string;
  detail: string;
  weight: number;
}[] = [
  {
    key: "academicCompetence",
    label: "Academic/Technical Competence",
    detail: "Assess the understanding of subject area and technical skills",
    weight: 20,
  },
  {
    key: "progressOutput",
    label: "Progress and Output",
    detail: "Assess achievement of planned objectives and milestones",
    weight: 20,
  },
  {
    key: "qualityOfWork",
    label: "Quality of Work",
    detail: "Assess the accuracy, depth and originality",
    weight: 20,
  },
  {
    key: "initiativeIndependence",
    label: "Initiative and Independence",
    detail: "Assess the ability to work independently and solve problems",
    weight: 20,
  },
  {
    key: "communicationSkills",
    label: "Communication Skills",
    detail: "Assess the written and oral communication",
    weight: 10,
  },
  {
    key: "professionalConduct",
    label: "Professional Conduct",
    detail: "Assess the punctuality, teamwork and ethics",
    weight: 10,
  },
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newObjective(): ObjectiveRow {
  return { id: newId(), description: "", status: "", comments: "" };
}

function newChallenge(): ChallengeRow {
  return { id: newId(), issue: "", impact: "", recommendations: "" };
}

const EMPTY_FORM: FormState = {
  cohort: "cohort-1",
  programmeType: "",
  supervisorName: "",
  reportingDate: "",
  academicCompetence: "",
  progressOutput: "",
  qualityOfWork: "",
  initiativeIndependence: "",
  communicationSkills: "",
  professionalConduct: "",
  mastersCoursePerformance: "",
  mastersAssignmentQuality: "",
  phdResearchProgress: "",
  phdResearchQuality: "",
  phdPublicationPotential: "",
  traineePracticalSkills: "",
  traineeIndustryReadiness: "",
  traineeWorkplaceIntegration: "",
  objectives: [newObjective()],
  overallPerformance: "",
  challenges: [newChallenge()],
  recommendation: "",
  finalRemarks: "",
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

function mapProgrammeType(type: string): ProgrammeType {
  if (/phd/i.test(type)) return "phd";
  if (/trainee/i.test(type)) return "trainee";
  if (/msc|master/i.test(type)) return "masters";
  return "";
}

function weightedScore(rating: Rating, weight: number): number | null {
  if (!rating) return null;
  return (Number(rating) * weight) / 5;
}

function formatScore(value: number | null): string {
  if (value === null) return "Pending";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function storageKey(applicationId: string): string {
  return `smecc2e.supervisor-evaluation-final.${applicationId}`;
}

export function SupervisorEvaluationFinalForm({
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
      const mobility = app?.typeOfMobility ?? "";
      if (!raw) {
        setForm({
          ...EMPTY_FORM,
          objectives: [newObjective()],
          challenges: [newChallenge()],
          programmeType: mapProgrammeType(mobility),
        });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({
        ...EMPTY_FORM,
        ...parsed,
        objectives:
          parsed.objectives && parsed.objectives.length > 0
            ? parsed.objectives
            : [newObjective()],
        challenges:
          parsed.challenges && parsed.challenges.length > 0
            ? parsed.challenges
            : [newChallenge()],
        programmeType:
          parsed.programmeType || mapProgrammeType(mobility),
      });
      if (parsed.signedAt) setSaved(true);
    } catch {
      setForm({
        ...EMPTY_FORM,
        objectives: [newObjective()],
        challenges: [newChallenge()],
      });
    }
  }, [applicationId, app?.typeOfMobility]);

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

  const scores = RATING_CRITERIA.map((criterion) => ({
    ...criterion,
    rating: form[criterion.key],
    score: weightedScore(form[criterion.key], criterion.weight),
  }));
  const totalWeighted = scores.every((item) => item.score !== null)
    ? scores.reduce((sum, item) => sum + (item.score ?? 0), 0)
    : null;

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

  const updateObjective = (id: string, patch: Partial<ObjectiveRow>) => {
    update({
      objectives: form.objectives.map((row) =>
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

  const sign = () => {
    if (saved) return;
    if (!form.supervisorName.trim()) {
      setError("Enter the supervisor name.");
      return;
    }
    if (!form.reportingDate) {
      setError("Enter the reporting date.");
      return;
    }
    if (scores.some((item) => !item.rating)) {
      setError("Complete all performance ratings (0–5).");
      return;
    }
    if (!form.overallPerformance) {
      setError("Select the overall performance rating.");
      return;
    }
    if (!form.recommendation) {
      setError("Select a recommendation.");
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
    const next = {
      ...form,
      signature: form.supervisorName.trim(),
      signedAt,
    };
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
            Supervisor / host evaluation report (final)
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Form code: SUP-02 | Module: Supervision & Progress | Primary user:
            Host supervisor
          </p>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="font-bold text-[#062763]">Purpose. </span>
          Replace the generic evaluation with the approved SMECC2E Annex B
          structure.
        </p>

        <FormTable title="General information">
          <ChoiceRow label="Mobility cohort">
            <RadioGroup
              name="sup-eval-final-cohort"
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
          <ChoiceRow label="Programme type">
            <RadioGroup
              name="sup-eval-final-programme"
              value={form.programmeType}
              disabled={saved}
              onChange={(programmeType) =>
                update({ programmeType: programmeType as ProgrammeType })
              }
              options={[
                ["masters", "Masters"],
                ["phd", "PhD"],
                ["trainee", "Trainee"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Supervisor name"
            value={form.supervisorName}
            disabled={saved}
            onChange={(supervisorName) => update({ supervisorName })}
          />
          <ReadRow label="Reporting period" value="Final" />
          <TextRow
            label="Date"
            type="date"
            value={form.reportingDate}
            disabled={saved}
            onChange={(reportingDate) => update({ reportingDate })}
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Performance rating — 1 to 5
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-3 py-2">
                  Field / item
                </th>
                <th className="border border-slate-300 px-3 py-2">Rating</th>
                <th className="border border-slate-300 px-3 py-2">Weight (%)</th>
                <th className="border border-slate-300 px-3 py-2">
                  Weighted score
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.map((item) => (
                <tr key={item.key}>
                  <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top font-semibold text-[#062763]">
                    <span className="block">{item.label}</span>
                    <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-600">
                      {item.detail}
                    </span>
                  </th>
                  <td className="border border-slate-300 px-3 py-2">
                    <select
                      value={item.rating}
                      disabled={saved}
                      onChange={(event) =>
                        update({
                          [item.key]: event.target.value as Rating,
                        } as Partial<FormState>)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    >
                      <option value="">—</option>
                      {["0", "1", "2", "3", "4", "5"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
                    {item.weight}%
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
                    {formatScore(item.score)}
                  </td>
                </tr>
              ))}
              <tr>
                <th
                  colSpan={3}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-[#062763]"
                >
                  Total weighted score
                </th>
                <td className="border border-slate-300 px-3 py-2 font-semibold text-[#062763]">
                  {formatScore(totalWeighted)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <FormTable title="Category-specific assessment">
          <TextRow
            label="Masters — course performance and participation"
            value={form.mastersCoursePerformance}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(mastersCoursePerformance) =>
              update({ mastersCoursePerformance })
            }
          />
          <TextRow
            label="Masters — assignment/project quality"
            value={form.mastersAssignmentQuality}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(mastersAssignmentQuality) =>
              update({ mastersAssignmentQuality })
            }
          />
          <TextRow
            label="PhD — research progress"
            value={form.phdResearchProgress}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(phdResearchProgress) =>
              update({ phdResearchProgress })
            }
          />
          <TextRow
            label="PhD — quality of research proposal/work"
            value={form.phdResearchQuality}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(phdResearchQuality) => update({ phdResearchQuality })}
          />
          <TextRow
            label="PhD — publication potential"
            value={form.phdPublicationPotential}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(phdPublicationPotential) =>
              update({ phdPublicationPotential })
            }
          />
          <TextRow
            label="Trainee — practical skills development"
            value={form.traineePracticalSkills}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(traineePracticalSkills) =>
              update({ traineePracticalSkills })
            }
          />
          <TextRow
            label="Trainee — industry readiness"
            value={form.traineeIndustryReadiness}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(traineeIndustryReadiness) =>
              update({ traineeIndustryReadiness })
            }
          />
          <TextRow
            label="Trainee — workplace integration"
            value={form.traineeWorkplaceIntegration}
            disabled={saved}
            multiline
            placeholder="Text / N/A"
            onChange={(traineeWorkplaceIntegration) =>
              update({ traineeWorkplaceIntegration })
            }
          />
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Learning objectives & recommendation — objectives achieved
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">
                  Description of objectives
                </th>
                <th className="border border-slate-300 px-2 py-2">
                  Status of achievement
                </th>
                <th className="border border-slate-300 px-2 py-2">Comments</th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.objectives.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.description}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateObjective(row.id, {
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
                        updateObjective(row.id, {
                          status: event.target.value as ObjectiveStatus,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="on_going">On-going</option>
                      <option value="not_started">Not-Started</option>
                    </select>
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.comments}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateObjective(row.id, {
                          comments: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-[#062763]"
                    />
                  </td>
                  <td className="border border-slate-300 px-2 py-2">
                    {!saved && form.objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            objectives: form.objectives.filter(
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
                update({ objectives: [...form.objectives, newObjective()] })
              }
              className="mt-2 text-sm font-semibold text-[#062763] underline-offset-2 hover:underline"
            >
              Add another objective
            </button>
          )}
        </section>

        <FormTable title="Overall performance">
          <ChoiceRow label="Overall performance">
            <RadioGroup
              name="sup-eval-final-overall"
              value={form.overallPerformance}
              disabled={saved}
              onChange={(overallPerformance) =>
                update({
                  overallPerformance:
                    overallPerformance as OverallPerformance,
                })
              }
              options={[
                ["excellent", "Excellent"],
                ["very_good", "Very Good"],
                ["good", "Good"],
                ["needs_improvement", "Needs Improvement"],
              ]}
            />
          </ChoiceRow>
        </FormTable>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="bg-[#062763] px-4 py-2 text-left text-sm font-bold text-white">
              Challenges observed
            </caption>
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="border border-slate-300 px-2 py-2">Issue</th>
                <th className="border border-slate-300 px-2 py-2">Impact</th>
                <th className="border border-slate-300 px-2 py-2">
                  Recommendations
                </th>
                <th className="border border-slate-300 px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {form.challenges.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-2 py-2">
                    <textarea
                      value={row.issue}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateChallenge(row.id, { issue: event.target.value })
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
                      value={row.recommendations}
                      disabled={saved}
                      rows={2}
                      onChange={(event) =>
                        updateChallenge(row.id, {
                          recommendations: event.target.value,
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

        <FormTable title="Recommendation & final remarks">
          <ChoiceRow label="Recommendation">
            <RadioGroup
              name="sup-eval-final-recommendation"
              value={form.recommendation}
              disabled={saved}
              onChange={(recommendation) =>
                update({ recommendation: recommendation as Recommendation })
              }
              options={[
                ["continue_as_planned", "Continue as planned"],
                ["minor_adjustments", "Minor adjustments"],
                ["major_intervention", "Major intervention"],
              ]}
            />
          </ChoiceRow>
          <TextRow
            label="Final remarks"
            value={form.finalRemarks}
            disabled={saved}
            multiline
            rows={4}
            onChange={(finalRemarks) => update({ finalRemarks })}
          />
        </FormTable>

        <section>
          <h2 className="bg-[#062763] px-4 py-2 text-sm font-bold text-white">
            Required / supporting attachments
          </h2>
          <p className="mt-3 px-1 text-sm leading-6 text-slate-700">
            No mandatory attachment unless triggered by the form or requested by
            an authorised reviewer.
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
              disabled={saved}
              onChange={(event) => update({ declared: event.target.checked })}
              className="mt-1"
            />
            <span>{DECLARATION}</span>
          </label>
        </section>

        <SignTable
          title="Approval / sign-off"
          rows={[
            {
              role: "Host Supervisor",
              name: form.supervisorName.trim() || "Pending",
              signature: form.signature || "Awaiting signature",
              date: form.signedAt || "Awaiting signature",
            },
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
              signature: "Pending",
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
            Final supervisor evaluation signed
            {form.signedAt ? ` on ${form.signedAt}` : ""}.
          </p>
        )}

        <button
          type="button"
          onClick={sign}
          disabled={saved}
          className="inline-flex rounded-lg bg-[#062763] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
        >
          {saved ? "Form signed" : "Sign final supervisor evaluation"}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date";
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <ChoiceRow label={label}>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#062763]"
        />
      ) : (
        <input
          type={type}
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
