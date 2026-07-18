export type ProjectMandEIndicator = {
  id: string;
  indicator: string;
  type: string;
  unitOfMeasurement: string;
  baselineValue: string;
  targetValue: string;
  currentStatus: string;
  completionRate: number;
};

const STORAGE_KEY = "smecc2e-project-m-and-e";

export function createMandEId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `me-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampCompletionRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Parse a numeric value from baseline / target / current status fields. */
export function parseMandENumeric(value: string): number | null {
  const trimmed = value.trim().replace(/%$/, "");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Completion rate (%) = currentStatus × 100 / (targetValue − baselineValue)
 * Returns 0 when inputs are missing/invalid or the denominator is 0.
 */
export function calculateMandECompletionRate(
  currentStatus: string,
  targetValue: string,
  baselineValue: string
): number {
  const current = parseMandENumeric(currentStatus);
  const target = parseMandENumeric(targetValue);
  const baseline = parseMandENumeric(baselineValue);
  if (current === null || target === null || baseline === null) return 0;
  const denominator = target - baseline;
  if (denominator === 0) return 0;
  return clampCompletionRate((current * 100) / denominator);
}

export function loadMandEFromStorage(): ProjectMandEIndicator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeIndicator)
      .filter((item): item is ProjectMandEIndicator => item != null);
  } catch {
    return [];
  }
}

export function saveMandEToStorage(indicators: ProjectMandEIndicator[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
}

export function normalizeMandEIndicator(
  value: unknown
): ProjectMandEIndicator | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const indicator =
    typeof record.indicator === "string" ? record.indicator.trim() : "";
  if (!indicator) return null;
  const baselineValue =
    typeof record.baselineValue === "string"
      ? record.baselineValue.trim()
      : "";
  const targetValue =
    typeof record.targetValue === "string" ? record.targetValue.trim() : "";
  const currentStatus =
    typeof record.currentStatus === "string"
      ? record.currentStatus.trim()
      : "";
  return {
    id:
      typeof record.id === "string" && record.id ? record.id : createMandEId(),
    indicator,
    type: typeof record.type === "string" ? record.type.trim() : "",
    unitOfMeasurement:
      typeof record.unitOfMeasurement === "string"
        ? record.unitOfMeasurement.trim()
        : "",
    baselineValue,
    targetValue,
    currentStatus,
    completionRate: calculateMandECompletionRate(
      currentStatus,
      targetValue,
      baselineValue
    ),
  };
}

function normalizeIndicator(value: unknown): ProjectMandEIndicator | null {
  return normalizeMandEIndicator(value);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_%()-]+/g, "");
}

const HEADER_ALIASES: Record<
  keyof Omit<ProjectMandEIndicator, "id" | "completionRate">,
  string[]
> = {
  indicator: ["indicator", "indicatorname"],
  type: ["type", "indicatortype"],
  unitOfMeasurement: ["unitofmeasurement", "unit", "uom", "measurement"],
  baselineValue: ["baselinevalue", "baseline"],
  targetValue: [
    "targetvalue",
    "target",
    "targetvalueattheendoftheproject",
    "endoftheproject",
  ],
  currentStatus: ["currentstatus", "status", "current"],
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

export function mandEFromCsv(
  headers: string[],
  rows: string[][]
): { indicators: ProjectMandEIndicator[]; errors: string[] } {
  const indexes = {
    indicator: findColumnIndex(headers, "indicator"),
    type: findColumnIndex(headers, "type"),
    unitOfMeasurement: findColumnIndex(headers, "unitOfMeasurement"),
    baselineValue: findColumnIndex(headers, "baselineValue"),
    targetValue: findColumnIndex(headers, "targetValue"),
    currentStatus: findColumnIndex(headers, "currentStatus"),
  };

  if (indexes.indicator < 0) {
    return {
      indicators: [],
      errors: ['CSV must include an "Indicator" column.'],
    };
  }

  const indicators: ProjectMandEIndicator[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const indicator = (row[indexes.indicator] ?? "").trim();
    if (!indicator) {
      if (row.some((cell) => cell.trim())) {
        errors.push(`Row ${line}: Indicator is required.`);
      }
      return;
    }

    const baselineValue =
      indexes.baselineValue >= 0
        ? (row[indexes.baselineValue] ?? "").trim()
        : "";
    const targetValue =
      indexes.targetValue >= 0 ? (row[indexes.targetValue] ?? "").trim() : "";
    const currentStatus =
      indexes.currentStatus >= 0
        ? (row[indexes.currentStatus] ?? "").trim()
        : "";

    indicators.push({
      id: createMandEId(),
      indicator,
      type: indexes.type >= 0 ? (row[indexes.type] ?? "").trim() : "",
      unitOfMeasurement:
        indexes.unitOfMeasurement >= 0
          ? (row[indexes.unitOfMeasurement] ?? "").trim()
          : "",
      baselineValue,
      targetValue,
      currentStatus,
      completionRate: calculateMandECompletionRate(
        currentStatus,
        targetValue,
        baselineValue
      ),
    });
  });

  return { indicators, errors };
}
