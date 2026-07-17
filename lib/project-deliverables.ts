import {
  formatMilestoneDueDate,
  getMilestoneCountdown,
  parseMilestoneDueDate,
  type MilestoneCountdown,
} from "./project-milestones";

export const DELIVERABLE_STATUSES = [
  "Not Started",
  "On-going",
  "Completed",
] as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export type ProjectDeliverable = {
  id: string;
  workPackageNo: string;
  deliverableNo: string;
  name: string;
  description: string;
  leadBeneficiary: string;
  dueDate: string;
  status: DeliverableStatus;
};

export type DeliverableCountdown = MilestoneCountdown;

const STORAGE_KEY = "smecc2e-project-deliverables";

export const getDeliverableCountdown = getMilestoneCountdown;
export const formatDeliverableDueDate = formatMilestoneDueDate;
export const parseDeliverableDueDate = parseMilestoneDueDate;

export function isDeliverableStatus(value: string): value is DeliverableStatus {
  return (DELIVERABLE_STATUSES as readonly string[]).includes(value);
}

export function createDeliverableId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadDeliverablesFromStorage(): ProjectDeliverable[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeDeliverable)
      .filter((item): item is ProjectDeliverable => item != null);
  } catch {
    return [];
  }
}

export function saveDeliverablesToStorage(
  deliverables: ProjectDeliverable[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deliverables));
}

function normalizeDeliverable(value: unknown): ProjectDeliverable | null {
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
        : createDeliverableId(),
    workPackageNo:
      typeof record.workPackageNo === "string"
        ? record.workPackageNo.trim()
        : "",
    deliverableNo:
      typeof record.deliverableNo === "string"
        ? record.deliverableNo.trim()
        : "",
    name,
    description:
      typeof record.description === "string" ? record.description.trim() : "",
    leadBeneficiary:
      typeof record.leadBeneficiary === "string"
        ? record.leadBeneficiary.trim()
        : "",
    dueDate: typeof record.dueDate === "string" ? record.dueDate.trim() : "",
    status: isDeliverableStatus(statusRaw) ? statusRaw : "Not Started",
  };
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<
  keyof Omit<ProjectDeliverable, "id">,
  string[]
> = {
  workPackageNo: [
    "workpackageno",
    "workpackagenumber",
    "workpackage",
    "wp",
    "wpno",
  ],
  deliverableNo: [
    "deliverableno",
    "deliverablenumber",
    "deliverableid",
    "dno",
  ],
  name: ["deliverablename", "name", "deliverable"],
  description: ["description", "desc", "details"],
  leadBeneficiary: ["leadbeneficiary", "lead", "beneficiary"],
  dueDate: ["duedate", "due", "deadline"],
  status: ["status"],
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

export function deliverablesFromCsv(
  headers: string[],
  rows: string[][]
): { deliverables: ProjectDeliverable[]; errors: string[] } {
  const indexes = {
    workPackageNo: findColumnIndex(headers, "workPackageNo"),
    deliverableNo: findColumnIndex(headers, "deliverableNo"),
    name: findColumnIndex(headers, "name"),
    description: findColumnIndex(headers, "description"),
    leadBeneficiary: findColumnIndex(headers, "leadBeneficiary"),
    dueDate: findColumnIndex(headers, "dueDate"),
    status: findColumnIndex(headers, "status"),
  };

  if (indexes.name < 0) {
    return {
      deliverables: [],
      errors: [
        'CSV must include a "Deliverable Name" column (or "Deliverable" / "Name").',
      ],
    };
  }

  const deliverables: ProjectDeliverable[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = (row[indexes.name] ?? "").trim();
    if (!name) {
      if (row.some((cell) => cell.trim())) {
        errors.push(`Row ${line}: Deliverable Name is required.`);
      }
      return;
    }

    const statusRaw =
      indexes.status >= 0 ? (row[indexes.status] ?? "").trim() : "Not Started";
    const normalizedStatus = statusRaw
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    let status: DeliverableStatus | null = isDeliverableStatus(statusRaw)
      ? statusRaw
      : null;
    if (!status) {
      if (!statusRaw) status = "Not Started";
      else if (normalizedStatus === "not started") status = "Not Started";
      else if (normalizedStatus === "on-going" || normalizedStatus === "ongoing")
        status = "On-going";
      else if (normalizedStatus === "completed") status = "Completed";
    }

    if (status === null) {
      errors.push(
        `Row ${line}: Invalid status "${statusRaw}". Use Not Started, On-going, or Completed.`
      );
      return;
    }

    const dueDate =
      indexes.dueDate >= 0 ? (row[indexes.dueDate] ?? "").trim() : "";
    if (dueDate && !parseDeliverableDueDate(dueDate)) {
      errors.push(`Row ${line}: Invalid due date "${dueDate}".`);
      return;
    }

    deliverables.push({
      id: createDeliverableId(),
      workPackageNo:
        indexes.workPackageNo >= 0
          ? (row[indexes.workPackageNo] ?? "").trim()
          : "",
      deliverableNo:
        indexes.deliverableNo >= 0
          ? (row[indexes.deliverableNo] ?? "").trim()
          : "",
      name,
      description:
        indexes.description >= 0 ? (row[indexes.description] ?? "").trim() : "",
      leadBeneficiary:
        indexes.leadBeneficiary >= 0
          ? (row[indexes.leadBeneficiary] ?? "").trim()
          : "",
      dueDate,
      status,
    });
  });

  return { deliverables, errors };
}
