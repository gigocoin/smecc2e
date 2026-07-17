export type YesNoAnswer = "Yes" | "No" | "";

export type ProjectRisk = {
  id: string;
  workPackage: string;
  riskMitigationMeasures: string;
  stateOfThePlayPeriod: string;
  appliedMitigationMeasures: YesNoAnswer;
  riskMaterialised: YesNoAnswer;
  stateOfThePlayComments: string;
  actions: string;
};

export const YES_NO_OPTIONS: YesNoAnswer[] = ["Yes", "No"];

const STORAGE_KEY = "smecc2e-project-risks";

export function createRiskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `risk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseYesNo(value: unknown): YesNoAnswer {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "y" || normalized === "true") {
    return "Yes";
  }
  if (normalized === "no" || normalized === "n" || normalized === "false") {
    return "No";
  }
  return "";
}

export function loadRisksFromStorage(): ProjectRisk[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRisk)
      .filter((item): item is ProjectRisk => item != null);
  } catch {
    return [];
  }
}

export function saveRisksToStorage(risks: ProjectRisk[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(risks));
}

function normalizeRisk(value: unknown): ProjectRisk | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const workPackage =
    typeof record.workPackage === "string" ? record.workPackage.trim() : "";
  if (!workPackage) return null;
  return {
    id:
      typeof record.id === "string" && record.id ? record.id : createRiskId(),
    workPackage,
    riskMitigationMeasures:
      typeof record.riskMitigationMeasures === "string"
        ? record.riskMitigationMeasures.trim()
        : "",
    stateOfThePlayPeriod:
      typeof record.stateOfThePlayPeriod === "string"
        ? record.stateOfThePlayPeriod.trim()
        : "",
    appliedMitigationMeasures: parseYesNo(record.appliedMitigationMeasures),
    riskMaterialised: parseYesNo(record.riskMaterialised),
    stateOfThePlayComments:
      typeof record.stateOfThePlayComments === "string"
        ? record.stateOfThePlayComments.trim()
        : "",
    actions: typeof record.actions === "string" ? record.actions.trim() : "",
  };
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_%()-?]+/g, "");
}

const HEADER_ALIASES: Record<keyof Omit<ProjectRisk, "id">, string[]> = {
  workPackage: ["workpackage", "wp", "workpackageno", "workpackagenumber"],
  riskMitigationMeasures: [
    "riskmitigationmeasures",
    "mitigationmeasures",
    "mitigation",
  ],
  stateOfThePlayPeriod: [
    "stateoftheplayperiod",
    "stateofplayperiod",
    "period",
  ],
  appliedMitigationMeasures: [
    "appliedmitigationmeasures",
    "didyouapplyriskmitigationmeasures",
    "appliedmitigation",
  ],
  riskMaterialised: [
    "riskmaterialised",
    "riskmaterialized",
    "didyourriskmaterialise",
    "didyourriskmaterialize",
  ],
  stateOfThePlayComments: [
    "stateoftheplaycomments",
    "stateofplaycomments",
    "comments",
  ],
  actions: ["actions", "action"],
};

function findColumnIndex(
  headers: string[],
  field: keyof typeof HEADER_ALIASES
) {
  const aliases = HEADER_ALIASES[field];
  return headers.findIndex((header) =>
    aliases.includes(normalizeHeader(header))
  );
}

export function risksFromCsv(
  headers: string[],
  rows: string[][]
): { risks: ProjectRisk[]; errors: string[] } {
  const indexes = {
    workPackage: findColumnIndex(headers, "workPackage"),
    riskMitigationMeasures: findColumnIndex(headers, "riskMitigationMeasures"),
    stateOfThePlayPeriod: findColumnIndex(headers, "stateOfThePlayPeriod"),
    appliedMitigationMeasures: findColumnIndex(
      headers,
      "appliedMitigationMeasures"
    ),
    riskMaterialised: findColumnIndex(headers, "riskMaterialised"),
    stateOfThePlayComments: findColumnIndex(headers, "stateOfThePlayComments"),
    actions: findColumnIndex(headers, "actions"),
  };

  if (indexes.workPackage < 0) {
    return {
      risks: [],
      errors: ['CSV must include a "Work Package" column.'],
    };
  }

  const risks: ProjectRisk[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const workPackage = (row[indexes.workPackage] ?? "").trim();
    if (!workPackage) {
      if (row.some((cell) => cell.trim())) {
        errors.push(`Row ${line}: Work Package is required.`);
      }
      return;
    }

    risks.push({
      id: createRiskId(),
      workPackage,
      riskMitigationMeasures:
        indexes.riskMitigationMeasures >= 0
          ? (row[indexes.riskMitigationMeasures] ?? "").trim()
          : "",
      stateOfThePlayPeriod:
        indexes.stateOfThePlayPeriod >= 0
          ? (row[indexes.stateOfThePlayPeriod] ?? "").trim()
          : "",
      appliedMitigationMeasures:
        indexes.appliedMitigationMeasures >= 0
          ? parseYesNo(row[indexes.appliedMitigationMeasures])
          : "",
      riskMaterialised:
        indexes.riskMaterialised >= 0
          ? parseYesNo(row[indexes.riskMaterialised])
          : "",
      stateOfThePlayComments:
        indexes.stateOfThePlayComments >= 0
          ? (row[indexes.stateOfThePlayComments] ?? "").trim()
          : "",
      actions: indexes.actions >= 0 ? (row[indexes.actions] ?? "").trim() : "",
    });
  });

  return { risks, errors };
}
