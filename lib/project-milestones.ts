export const MILESTONE_STATUSES = [
  "Not Started",
  "On-going",
  "Completed",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export type ProjectMilestone = {
  id: string;
  name: string;
  workPackageNo: string;
  leadBeneficiary: string;
  meansOfVerification: string;
  dueDate: string;
  status: MilestoneStatus;
};

export type MilestoneCountdown = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  label: string;
};

const STORAGE_KEY = "smecc2e-project-milestones";

export function isMilestoneStatus(value: string): value is MilestoneStatus {
  return (MILESTONE_STATUSES as readonly string[]).includes(value);
}

export function createMilestoneId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getMilestoneCountdown(
  dueDate: string,
  now: Date = new Date()
): MilestoneCountdown {
  const due = parseMilestoneDueDate(dueDate);
  if (!due) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
      label: "—",
    };
  }

  const totalMs = due.getTime() - now.getTime();
  const expired = totalMs <= 0;
  const absMs = Math.abs(totalMs);
  const totalSeconds = Math.floor(absMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    expired,
    label: expired ? `Overdue ${clock}` : clock,
  };
}

export function parseMilestoneDueDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatMilestoneDueDate(value: string): string {
  const parsed = parseMilestoneDueDate(value);
  if (!parsed) return value || "—";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function loadMilestonesFromStorage(): ProjectMilestone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeMilestone)
      .filter((item): item is ProjectMilestone => item != null);
  } catch {
    return [];
  }
}

export function saveMilestonesToStorage(milestones: ProjectMilestone[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
}

function normalizeMilestone(value: unknown): ProjectMilestone | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;
  const statusRaw =
    typeof record.status === "string" ? record.status.trim() : "Not Started";
  return {
    id:
      typeof record.id === "string" && record.id
        ? record.id
        : createMilestoneId(),
    name,
    workPackageNo:
      typeof record.workPackageNo === "string" ? record.workPackageNo.trim() : "",
    leadBeneficiary:
      typeof record.leadBeneficiary === "string"
        ? record.leadBeneficiary.trim()
        : "",
    meansOfVerification:
      typeof record.meansOfVerification === "string"
        ? record.meansOfVerification.trim()
        : "",
    dueDate: typeof record.dueDate === "string" ? record.dueDate.trim() : "",
    status: isMilestoneStatus(statusRaw) ? statusRaw : "Not Started",
  };
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<keyof Omit<ProjectMilestone, "id">, string[]> = {
  name: ["milestonename", "milestone", "name"],
  workPackageNo: [
    "workpackageno",
    "workpackagenumber",
    "workpackage",
    "wp",
    "wpno",
  ],
  leadBeneficiary: ["leadbeneficiary", "lead", "beneficiary"],
  meansOfVerification: [
    "meansofverification",
    "verification",
    "mov",
    "means",
  ],
  dueDate: ["duedate", "due", "deadline"],
  status: ["status"],
};

function findColumnIndex(headers: string[], field: keyof typeof HEADER_ALIASES) {
  const aliases = HEADER_ALIASES[field];
  return headers.findIndex((header) =>
    aliases.includes(normalizeHeader(header))
  );
}

export function milestonesFromCsv(
  headers: string[],
  rows: string[][]
): { milestones: ProjectMilestone[]; errors: string[] } {
  const indexes = {
    name: findColumnIndex(headers, "name"),
    workPackageNo: findColumnIndex(headers, "workPackageNo"),
    leadBeneficiary: findColumnIndex(headers, "leadBeneficiary"),
    meansOfVerification: findColumnIndex(headers, "meansOfVerification"),
    dueDate: findColumnIndex(headers, "dueDate"),
    status: findColumnIndex(headers, "status"),
  };

  if (indexes.name < 0) {
    return {
      milestones: [],
      errors: [
        'CSV must include a "Milestone Name" column (or "Milestone" / "Name").',
      ],
    };
  }

  const milestones: ProjectMilestone[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = (row[indexes.name] ?? "").trim();
    if (!name) {
      if (row.some((cell) => cell.trim())) {
        errors.push(`Row ${line}: Milestone Name is required.`);
      }
      return;
    }

    const statusRaw =
      indexes.status >= 0 ? (row[indexes.status] ?? "").trim() : "Not Started";
    const status = isMilestoneStatus(statusRaw)
      ? statusRaw
      : statusRaw
        ? null
        : "Not Started";

    if (status === null) {
      errors.push(
        `Row ${line}: Invalid status "${statusRaw}". Use Not Started, On-going, or Completed.`
      );
      return;
    }

    const dueDate =
      indexes.dueDate >= 0 ? (row[indexes.dueDate] ?? "").trim() : "";
    if (dueDate && !parseMilestoneDueDate(dueDate)) {
      errors.push(`Row ${line}: Invalid due date "${dueDate}".`);
      return;
    }

    milestones.push({
      id: createMilestoneId(),
      name,
      workPackageNo:
        indexes.workPackageNo >= 0
          ? (row[indexes.workPackageNo] ?? "").trim()
          : "",
      leadBeneficiary:
        indexes.leadBeneficiary >= 0
          ? (row[indexes.leadBeneficiary] ?? "").trim()
          : "",
      meansOfVerification:
        indexes.meansOfVerification >= 0
          ? (row[indexes.meansOfVerification] ?? "").trim()
          : "",
      dueDate,
      status,
    });
  });

  return { milestones, errors };
}
