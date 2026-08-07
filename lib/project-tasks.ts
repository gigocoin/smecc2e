export type ProjectTaskLeadPartner = {
  id: string;
  name: string;
};

export const TASK_STATUSES = [
  "Not Started",
  "On-going",
  "Submitted",
  "Completed",
  "Rejected",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Statuses administrators and evaluators may set on work-package tasks. */
export const TASK_STATUS_LIMITED_EDIT = ["On-going", "Submitted"] as const;

export type TaskStatusLimitedEdit = (typeof TASK_STATUS_LIMITED_EDIT)[number];

export function isTaskStatusLimitedEdit(
  value: string
): value is TaskStatusLimitedEdit {
  return (TASK_STATUS_LIMITED_EDIT as readonly string[]).includes(value);
}

/** Label shown in the assignee Update Task Status modal. */
export function taskStatusLimitedEditLabel(status: TaskStatus): string {
  if (status === "Submitted") return "Submit Task";
  return status;
}

export type ProjectTask = {
  id: string;
  code: string;
  description: string;
  meansOfVerification: string;
  status: TaskStatus;
  leadPartners: ProjectTaskLeadPartner[];
  workPackage: string;
  /** True when this task was created via Duplicate. */
  isDuplicate?: boolean;
  duplicatedFromId?: string | null;
  completionComment?: string | null;
  completionFileName?: string | null;
  completionFileUrl?: string | null;
};

/** Task code prefixes that map to each Work Packages section. */
export const WORK_PACKAGE_TASK_CODE_PREFIX: Record<
  | "project_management_coordination"
  | "scholarship_selection_management"
  | "communication_dissemination",
  string
> = {
  project_management_coordination: "T1",
  scholarship_selection_management: "T2",
  communication_dissemination: "T3",
};

export function workPackageFromTaskCode(
  code: string
):
  | "project_management_coordination"
  | "scholarship_selection_management"
  | "communication_dissemination"
  | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith("T2")) return "scholarship_selection_management";
  if (normalized.startsWith("T3")) return "communication_dissemination";
  if (normalized.startsWith("T1")) return "project_management_coordination";
  return null;
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function createTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Builds a child task code by appending a numeric segment.
 * e.g. "T1.1" -> "T1.1.1", next unused sibling -> "T1.1.2"
 * Skips codes already present in `existingCodes`.
 */
export function nextDuplicatedTaskCode(
  code: string,
  existingCodes: Iterable<string> = []
): string {
  const trimmed = code.trim();
  if (!trimmed) return "";

  const used = new Set(
    [...existingCodes].map((value) => value.trim().toLowerCase()).filter(Boolean)
  );

  for (let segment = 1; segment <= 1000; segment += 1) {
    const candidate = `${trimmed}.${segment}`;
    if (!used.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${trimmed}.1`;
}
