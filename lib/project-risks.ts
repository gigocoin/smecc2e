export type YesNoAnswer = "Yes" | "No" | "";
export type RiskMaterialisedAnswer = "Yes" | "No" | "Partially" | "";

export type ProjectRisk = {
  id: string;
  description: string;
  workPackage: string;
  riskMitigationMeasures: string;
  stateOfThePlayPeriod: string;
  appliedMitigationMeasures: YesNoAnswer;
  riskMaterialised: RiskMaterialisedAnswer;
  stateOfThePlayComments: string;
  actions: string;
};

export const YES_NO_OPTIONS: YesNoAnswer[] = ["Yes", "No"];
export const RISK_MATERIALISED_OPTIONS: RiskMaterialisedAnswer[] = [
  "Yes",
  "No",
  "Partially",
];

export function createRiskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `risk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parseYesNo(value: unknown): YesNoAnswer {
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

export function parseRiskMaterialised(value: unknown): RiskMaterialisedAnswer {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "y" || normalized === "true") {
    return "Yes";
  }
  if (normalized === "no" || normalized === "n" || normalized === "false") {
    return "No";
  }
  if (
    normalized === "partially" ||
    normalized === "partial" ||
    normalized === "part"
  ) {
    return "Partially";
  }
  return "";
}

export function normalizeProjectRisk(value: unknown): ProjectRisk | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const workPackage =
    typeof record.workPackage === "string" ? record.workPackage.trim() : "";
  if (!workPackage) return null;
  return {
    id:
      typeof record.id === "string" && record.id ? record.id : createRiskId(),
    description:
      typeof record.description === "string" ? record.description.trim() : "",
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
    riskMaterialised: parseRiskMaterialised(record.riskMaterialised),
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
  description: ["description", "riskdescription", "risk"],
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
    description: findColumnIndex(headers, "description"),
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
      description:
        indexes.description >= 0
          ? (row[indexes.description] ?? "").trim()
          : "",
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
          ? parseRiskMaterialised(row[indexes.riskMaterialised])
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
