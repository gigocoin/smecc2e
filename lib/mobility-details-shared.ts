export const MOBILITY_THEMATIC_AREAS = [
  "Sustainable Energy",
  "Sustainable materials",
  "Energy Policy",
  "Energy Economics",
  "Climate Change",
  "Environment",
] as const;

export type MobilityThematicArea = (typeof MOBILITY_THEMATIC_AREAS)[number];

export type MobilityDetailsCohort = "cohort-1" | "cohort-2" | "cohort-3";

export type MobilitySupervisorStatus = "assigned" | "pending";

export type MobilityDiscrepancy = "yes" | "no";

export type MobilityDetailsFormData = {
  cohort: MobilityDetailsCohort;
  programme: string;
  thematicAreas: MobilityThematicArea[];
  faculty: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  supervisorStatus: MobilitySupervisorStatus;
  expectedOutput: string;
  discrepancy: MobilityDiscrepancy;
  discrepancyDetails: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const COHORTS = new Set(["cohort-1", "cohort-2", "cohort-3"]);
const SUPERVISOR = new Set(["assigned", "pending"]);
const DISCREPANCY = new Set(["yes", "no"]);
const THEMATIC = new Set<string>(MOBILITY_THEMATIC_AREAS);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asThematicAreas(value: unknown): MobilityThematicArea[] {
  if (!Array.isArray(value)) return [];
  const areas: MobilityThematicArea[] = [];
  for (const item of value) {
    const text = asString(item);
    if (THEMATIC.has(text) && !areas.includes(text as MobilityThematicArea)) {
      areas.push(text as MobilityThematicArea);
    }
  }
  return areas;
}

export function parseMobilityDetailsFormData(
  value: unknown
): MobilityDetailsFormData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cohort = asString(record.cohort);
  const programme = asString(record.programme);
  const thematicAreas = asThematicAreas(record.thematicAreas);
  const faculty = asString(record.faculty);
  const hostName = asString(record.hostName);
  const hostEmail = asString(record.hostEmail);
  const supervisorStatus = asString(record.supervisorStatus);
  const expectedOutput = asString(record.expectedOutput);
  const discrepancy = asString(record.discrepancy);
  const discrepancyDetails = asString(record.discrepancyDetails);
  const signature = asString(record.signature);
  const signedAt = asString(record.signedAt);

  if (!COHORTS.has(cohort)) return null;
  if (!programme || thematicAreas.length === 0 || !faculty) return null;
  if (!hostName || !hostEmail) return null;
  if (!SUPERVISOR.has(supervisorStatus)) return null;
  if (!expectedOutput) return null;
  if (!DISCREPANCY.has(discrepancy)) return null;
  if (discrepancy === "yes" && !discrepancyDetails) return null;
  if (!signature || !signedAt) return null;
  if (record.declared !== true) return null;

  return {
    cohort: cohort as MobilityDetailsCohort,
    programme,
    thematicAreas,
    faculty,
    hostName,
    hostEmail,
    hostPhone: asString(record.hostPhone),
    supervisorStatus: supervisorStatus as MobilitySupervisorStatus,
    expectedOutput,
    discrepancy: discrepancy as MobilityDiscrepancy,
    discrepancyDetails: discrepancy === "yes" ? discrepancyDetails : "",
    declared: true,
    signature,
    signedAt,
  };
}

export function validateMobilityDetailsFormData(
  value: unknown
): MobilityDetailsFormData {
  const parsed = parseMobilityDetailsFormData(value);
  if (!parsed) {
    throw new Error("Mobility details confirmation form is incomplete");
  }
  return parsed;
}

export function mobilityDetailsCohortLabel(
  value: MobilityDetailsCohort
): string {
  if (value === "cohort-2") return "Cohort 2";
  if (value === "cohort-3") return "Cohort 3";
  return "Cohort 1";
}

export function mobilitySupervisorStatusLabel(
  value: MobilitySupervisorStatus
): string {
  return value === "assigned" ? "Assigned" : "Pending";
}

export function mobilityDiscrepancyLabel(value: MobilityDiscrepancy): string {
  return value === "yes" ? "Yes" : "No";
}
