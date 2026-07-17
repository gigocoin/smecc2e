export type ProjectMandEIndicator = {
  id: string;
  indicator: string;
  type: string;
  unitOfMeasurement: string;
  baselineValue: string;
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

function normalizeIndicator(value: unknown): ProjectMandEIndicator | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const indicator =
    typeof record.indicator === "string" ? record.indicator.trim() : "";
  if (!indicator) return null;
  const rateRaw = record.completionRate;
  const rate =
    typeof rateRaw === "number"
      ? rateRaw
      : typeof rateRaw === "string"
        ? Number.parseFloat(rateRaw)
        : 0;
  return {
    id:
      typeof record.id === "string" && record.id ? record.id : createMandEId(),
    indicator,
    type: typeof record.type === "string" ? record.type.trim() : "",
    unitOfMeasurement:
      typeof record.unitOfMeasurement === "string"
        ? record.unitOfMeasurement.trim()
        : "",
    baselineValue:
      typeof record.baselineValue === "string"
        ? record.baselineValue.trim()
        : "",
    currentStatus:
      typeof record.currentStatus === "string"
        ? record.currentStatus.trim()
        : "",
    completionRate: clampCompletionRate(rate),
  };
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_%()-]+/g, "");
}

const HEADER_ALIASES: Record<
  keyof Omit<ProjectMandEIndicator, "id">,
  string[]
> = {
  indicator: ["indicator", "indicatorname"],
  type: ["type", "indicatortype"],
  unitOfMeasurement: ["unitofmeasurement", "unit", "uom", "measurement"],
  baselineValue: ["baselinevalue", "baseline"],
  currentStatus: ["currentstatus", "status", "current"],
  completionRate: ["completionrate", "completion", "percent", "percentage"],
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
    currentStatus: findColumnIndex(headers, "currentStatus"),
    completionRate: findColumnIndex(headers, "completionRate"),
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

    const rateRaw =
      indexes.completionRate >= 0
        ? (row[indexes.completionRate] ?? "").trim().replace(/%$/, "")
        : "";
    let completionRate = 0;
    if (rateRaw) {
      const parsed = Number.parseFloat(rateRaw);
      if (!Number.isFinite(parsed)) {
        errors.push(`Row ${line}: Invalid completion rate "${rateRaw}".`);
        return;
      }
      completionRate = clampCompletionRate(parsed);
    }

    indicators.push({
      id: createMandEId(),
      indicator,
      type: indexes.type >= 0 ? (row[indexes.type] ?? "").trim() : "",
      unitOfMeasurement:
        indexes.unitOfMeasurement >= 0
          ? (row[indexes.unitOfMeasurement] ?? "").trim()
          : "",
      baselineValue:
        indexes.baselineValue >= 0
          ? (row[indexes.baselineValue] ?? "").trim()
          : "",
      currentStatus:
        indexes.currentStatus >= 0
          ? (row[indexes.currentStatus] ?? "").trim()
          : "",
      completionRate,
    });
  });

  return { indicators, errors };
}
