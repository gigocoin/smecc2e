"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isTaskStatus,
  isTaskStatusLimitedEdit,
  TASK_STATUS_LIMITED_EDIT,
  TASK_STATUSES,
  taskStatusLimitedEditLabel,
  WORK_PACKAGE_TASK_CODE_PREFIX,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/project-tasks";
import type { WorkPackageNavId } from "@/lib/coordinator-project-nav";
import { WORK_PACKAGE_SECTION_LABELS } from "@/lib/coordinator-project-nav";
import type { DashboardUser } from "@/lib/dashboard-users";

const actionIconBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function emptyForm() {
  return {
    code: "",
    description: "",
    meansOfVerification: "",
    status: "Not Started" as TaskStatus,
    leadPartnerIds: [] as string[],
    completionComment: "",
    completionFile: null as File | null,
  };
}

function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-900";
    case "Submitted":
      return "bg-amber-100 text-amber-900";
    case "On-going":
      return "bg-sky-100 text-sky-900";
    case "Rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

function compareTasks(a: ProjectTask, b: ProjectTask): number {
  return (a.code || a.description).localeCompare(
    b.code || b.description,
    undefined,
    { sensitivity: "base", numeric: true }
  );
}

type TaskTreeRow = {
  task: ProjectTask;
  depth: number;
  isLast: boolean;
  ancestorContinues: boolean[];
};

function buildTaskTreeRows(tasks: ProjectTask[]): TaskTreeRow[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const childrenByParent = new Map<string, ProjectTask[]>();
  const roots: ProjectTask[] = [];

  for (const task of tasks) {
    const parentId = task.duplicatedFromId;
    if (parentId && byId.has(parentId)) {
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(task);
      childrenByParent.set(parentId, siblings);
    } else {
      roots.push(task);
    }
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(compareTasks);
  }
  roots.sort(compareTasks);

  const rows: TaskTreeRow[] = [];

  const walk = (
    nodes: ProjectTask[],
    depth: number,
    ancestorContinues: boolean[]
  ) => {
    nodes.forEach((task, index) => {
      const isLast = index === nodes.length - 1;
      rows.push({
        task,
        depth,
        isLast,
        ancestorContinues: [...ancestorContinues],
      });
      const children = childrenByParent.get(task.id) ?? [];
      if (children.length > 0) {
        walk(children, depth + 1, [...ancestorContinues, !isLast]);
      }
    });
  };

  walk(roots, 0, []);
  return rows;
}

function TaskCodeTreeLabel({
  code,
  depth,
  isLast,
  ancestorContinues,
}: {
  code: string;
  depth: number;
  isLast: boolean;
  ancestorContinues: boolean[];
}) {
  const label = code || "—";
  if (depth <= 0) {
    return <span>{label}</span>;
  }

  const prefix = `${ancestorContinues
    .map((continues) => (continues ? "│   " : "    "))
    .join("")}${isLast ? "└── " : "├── "}`;

  return (
    <span className="inline-flex min-w-0 items-baseline gap-0">
      <span
        className="shrink-0 select-none whitespace-pre font-mono text-[13px] leading-5 text-pink-500"
        aria-hidden
      >
        {prefix}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

export function CoordinatorProjectWorkPackages({
  workPackage,
  canManage = true,
  canEditStatus = false,
}: {
  workPackage: WorkPackageNavId;
  canManage?: boolean;
  /** Administrators/evaluators: edit status only (On-going / Submit Task). */
  canEditStatus?: boolean;
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const packageLabel = WORK_PACKAGE_SECTION_LABELS[workPackage];
  const statusOnlyEdit = canEditStatus && !canManage;
  const modalOpen = createOpen || editingTask !== null;
  const showTaskFormModal =
    modalOpen &&
    (canManage ||
      (statusOnlyEdit &&
        editingTask !== null &&
        Boolean(
          currentUserId &&
            editingTask.leadPartners.some((p) => p.id === currentUserId)
        )));

  const isAssignedLeadPartner = useCallback(
    (task: ProjectTask) =>
      Boolean(
        currentUserId &&
          task.leadPartners.some((partner) => partner.id === currentUserId)
      ),
    [currentUserId]
  );

  const canEditTask = useCallback(
    (task: ProjectTask) => canManage || (statusOnlyEdit && isAssignedLeadPartner(task)),
    [canManage, statusOnlyEdit, isAssignedLeadPartner]
  );

  const statusSelectOptions = useMemo(() => {
    if (!statusOnlyEdit) return [...TASK_STATUSES];
    const options: TaskStatus[] = [...TASK_STATUS_LIMITED_EDIT];
    if (
      form.status &&
      !isTaskStatusLimitedEdit(form.status) &&
      isTaskStatus(form.status)
    ) {
      return [form.status, ...options];
    }
    return options;
  }, [statusOnlyEdit, form.status]);

  const taskTreeRows = useMemo(() => buildTaskTreeRows(tasks), [tasks]);

  const activeUsers = useMemo(
    () =>
      users
        .filter((user) => user.status === "Active")
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [users]
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/project-tasks?workPackage=${encodeURIComponent(workPackage)}`
      );
      const data = (await res.json()) as {
        tasks?: ProjectTask[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load tasks.");
        setTasks([]);
        return;
      }
      setTasks(data.tasks ?? []);
    } catch {
      setLoadError("Could not load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workPackage]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!statusOnlyEdit) {
      setCurrentUserId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as {
          user?: { id: string };
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.user?.id) {
          setCurrentUserId(null);
          return;
        }
        setCurrentUserId(data.user.id);
      } catch {
        if (!cancelled) setCurrentUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusOnlyEdit]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await fetch("/api/users");
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setUsersError(data.error ?? "Could not load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setUsersError("Could not load users.");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!modalOpen || statusOnlyEdit) return;
    void loadUsers();
  }, [modalOpen, statusOnlyEdit, loadUsers]);

  const resetForm = () => {
    setForm(emptyForm());
    setFormError(null);
    setUsersError(null);
  };

  const closeModal = () => {
    if (saving) return;
    setCreateOpen(false);
    setEditingTask(null);
    resetForm();
  };

  const closeViewModal = () => {
    setViewingTask(null);
  };

  const openCreateModal = () => {
    setViewingTask(null);
    setEditingTask(null);
    resetForm();
    setCreateOpen(true);
  };

  const openViewModal = (task: ProjectTask) => {
    setCreateOpen(false);
    setEditingTask(null);
    resetForm();
    setViewingTask(task);
  };

  const openEditModal = (task: ProjectTask) => {
    if (!canEditTask(task)) return;
    setViewingTask(null);
    setCreateOpen(false);
    setEditingTask(task);
    setForm({
      code: task.code,
      description: task.description,
      meansOfVerification: task.meansOfVerification,
      status: task.status,
      leadPartnerIds: task.leadPartners.map((partner) => partner.id),
      completionComment: task.completionComment ?? "",
      completionFile: null,
    });
    setFormError(null);
    setUsersError(null);
  };

  const handleApproveTask = async (task: ProjectTask) => {
    if (task.status !== "Submitted") return;
    const label = task.code || task.description || "this task";
    const confirmed = window.confirm(
      `Approve submitted documents for "${label}" and mark the task Completed?`
    );
    if (!confirmed) return;

    setActingOnId(task.id);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/project-tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve: true }),
        }
      );
      const data = (await res.json()) as {
        task?: ProjectTask;
        error?: string;
      };
      if (!res.ok || !data.task) {
        setLoadError(data.error ?? "Could not approve task.");
        return;
      }
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? data.task! : item))
      );
      if (viewingTask?.id === task.id) {
        setViewingTask(data.task);
      }
    } catch {
      setLoadError("Could not approve task.");
    } finally {
      setActingOnId(null);
    }
  };

  const handleDuplicateTask = async (task: ProjectTask) => {
    setActingOnId(task.id);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/project-tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duplicate: true }),
        }
      );
      const data = (await res.json()) as {
        task?: ProjectTask;
        error?: string;
      };
      if (!res.ok || !data.task) {
        setLoadError(data.error ?? "Could not duplicate task.");
        return;
      }
      setTasks((prev) => [...prev, data.task!]);
    } catch {
      setLoadError("Could not duplicate task.");
    } finally {
      setActingOnId(null);
    }
  };

  const handleDeleteTask = async (task: ProjectTask) => {
    const label = task.code || task.description || "this task";
    const confirmed = window.confirm(
      `Delete task "${label}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setActingOnId(task.id);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/project-tasks/${encodeURIComponent(task.id)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not delete task.");
        return;
      }
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
      if (editingTask?.id === task.id) {
        closeModal();
      }
    } catch {
      setLoadError("Could not delete task.");
    } finally {
      setActingOnId(null);
    }
  };

  const toggleLeadPartner = (userId: string) => {
    setForm((prev) => {
      const selected = prev.leadPartnerIds.includes(userId);
      return {
        ...prev,
        leadPartnerIds: selected
          ? prev.leadPartnerIds.filter((id) => id !== userId)
          : [...prev.leadPartnerIds, userId],
      };
    });
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (statusOnlyEdit) {
      if (!editingTask) return;
      if (!isAssignedLeadPartner(editingTask)) {
        setFormError(
          "You can only update the status of tasks assigned to you."
        );
        return;
      }
      if (!isTaskStatusLimitedEdit(form.status)) {
        setFormError('Status must be "On-going" or "Submit Task".');
        return;
      }
      if (form.status === "Submitted" && !form.completionComment.trim()) {
        setFormError("Enter a completion comment.");
        return;
      }

      setSaving(true);
      setFormError(null);
      try {
        let res: Response;
        if (form.status === "Submitted") {
          const body = new FormData();
          body.append("status", form.status);
          body.append("completionComment", form.completionComment.trim());
          if (form.completionFile) {
            body.append("file", form.completionFile);
          }
          res = await fetch(
            `/api/project-tasks/${encodeURIComponent(editingTask.id)}`,
            { method: "PATCH", body }
          );
        } else {
          res = await fetch(
            `/api/project-tasks/${encodeURIComponent(editingTask.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: form.status }),
            }
          );
        }
        const data = (await res.json()) as {
          task?: ProjectTask;
          error?: string;
        };
        if (!res.ok || !data.task) {
          setFormError(data.error ?? "Could not save task.");
          return;
        }
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTask.id ? data.task! : task
          )
        );
        setCreateOpen(false);
        setEditingTask(null);
        resetForm();
      } catch {
        setFormError("Could not save task.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.description.trim()) {
      setFormError("Enter the task description.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingTask) {
        const res = await fetch(
          `/api/project-tasks/${encodeURIComponent(editingTask.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: form.code.trim(),
              description: form.description.trim(),
              meansOfVerification: form.meansOfVerification.trim(),
              status: form.status,
              leadPartnerIds: form.leadPartnerIds,
            }),
          }
        );
        const data = (await res.json()) as {
          task?: ProjectTask;
          error?: string;
        };
        if (!res.ok || !data.task) {
          setFormError(data.error ?? "Could not save task.");
          return;
        }
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTask.id ? data.task! : task
          )
        );
      } else {
        const res = await fetch("/api/project-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code.trim(),
            description: form.description.trim(),
            meansOfVerification: form.meansOfVerification.trim(),
            status: form.status,
            workPackage,
            leadPartnerIds: form.leadPartnerIds,
          }),
        });
        const data = (await res.json()) as {
          task?: ProjectTask;
          error?: string;
        };
        if (!res.ok || !data.task) {
          setFormError(data.error ?? "Could not save task.");
          return;
        }
        setTasks((prev) => [...prev, data.task!]);
      }

      setCreateOpen(false);
      setEditingTask(null);
      resetForm();
    } catch {
      setFormError("Could not save task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div aria-live="polite" className="min-h-5">
          {loadError && (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {loadError}
            </p>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
          >
            Add Task
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-[#062763]">
            Tasks ({taskTreeRows.length})
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            {packageLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Task Code</th>
                <th className="px-4 py-3">Task Description</th>
                <th className="px-4 py-3">Means of Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Lead Partners</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taskTreeRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    {canManage
                      ? loading
                        ? "Loading tasks…"
                        : "No tasks yet. Add one to get started."
                      : loading
                        ? "Loading tasks…"
                        : "No tasks yet."}
                  </td>
                </tr>
              ) : (
                taskTreeRows.map(({ task, depth, isLast, ancestorContinues }) => (
                  <tr
                    key={task.id}
                    className={
                      task.isDuplicate || depth > 0
                        ? "bg-pink-50 hover:bg-pink-100/80"
                        : "hover:bg-[#062763]/5"
                    }
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <TaskCodeTreeLabel
                        code={task.code}
                        depth={depth}
                        isLast={isLast}
                        ancestorContinues={ancestorContinues}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {task.description}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {task.meansOfVerification || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(task.status)}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {task.leadPartners.length > 0
                        ? task.leadPartners.map((p) => p.name).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5">
                        {canManage && !task.isDuplicate && (
                          <button
                            type="button"
                            onClick={() => void handleDuplicateTask(task)}
                            disabled={actingOnId === task.id}
                            className={`${actionIconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                            aria-label={`Duplicate task ${task.code || task.description}`}
                            title="Duplicate task"
                          >
                            <DuplicateIcon />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openViewModal(task)}
                          disabled={actingOnId === task.id}
                          className={`${actionIconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                          aria-label={`View task ${task.code || task.description}`}
                          title="View task"
                        >
                          <ViewIcon />
                        </button>
                        {(canManage || statusOnlyEdit) && (
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            disabled={
                              actingOnId === task.id ||
                              (statusOnlyEdit && !isAssignedLeadPartner(task))
                            }
                            className={`${actionIconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                            aria-label={`Edit task ${task.code || task.description}`}
                            title={
                              statusOnlyEdit
                                ? isAssignedLeadPartner(task)
                                  ? "Update task status"
                                  : "Only available for tasks assigned to you"
                                : "Edit task"
                            }
                          >
                            <EditIcon />
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteTask(task)}
                            disabled={actingOnId === task.id}
                            className={`${actionIconBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                            aria-label={`Delete task ${task.code || task.description}`}
                            title="Delete task"
                          >
                            <DeleteIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-task-title"
          onClick={closeViewModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="view-task-title"
              className="shrink-0 border-b border-slate-100 px-5 py-3 text-base font-bold text-[#062763]"
            >
              View Task
            </h2>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Task Code
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {viewingTask.code || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Task Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
                  {viewingTask.description || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Means of Verification
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
                  {viewingTask.meansOfVerification || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Status
                </p>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(viewingTask.status)}`}
                  >
                    {viewingTask.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Lead Partners
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {viewingTask.leadPartners.length > 0
                    ? viewingTask.leadPartners.map((p) => p.name).join(", ")
                    : "—"}
                </p>
              </div>
              {(viewingTask.completionComment ||
                viewingTask.completionFileName) && (
                <>
                  {viewingTask.completionComment && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                        Completion Comment
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
                        {viewingTask.completionComment}
                      </p>
                    </div>
                  )}
                  {viewingTask.completionFileName && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                        Task File
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {viewingTask.completionFileUrl ? (
                          <a
                            href={viewingTask.completionFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#062763] underline"
                          >
                            {viewingTask.completionFileName}
                          </a>
                        ) : (
                          viewingTask.completionFileName
                        )}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3">
              {canManage && viewingTask.status === "Submitted" && (
                <button
                  type="button"
                  onClick={() => void handleApproveTask(viewingTask)}
                  disabled={actingOnId === viewingTask.id}
                  className="rounded-lg border-2 border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                >
                  Approve Submission
                </button>
              )}
              {canEditTask(viewingTask) && (
                <button
                  type="button"
                  onClick={() => openEditModal(viewingTask)}
                  className="rounded-lg border-2 border-[#062763] px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5"
                >
                  {statusOnlyEdit ? "Update Status" : "Edit"}
                </button>
              )}
              <button
                type="button"
                onClick={closeViewModal}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="task-modal-title"
              className="shrink-0 border-b border-slate-100 px-5 py-3 text-base font-bold text-[#062763]"
            >
              {statusOnlyEdit
                ? "Update Task Status"
                : editingTask
                  ? "Edit Task"
                  : "Add New Task"}
            </h2>
            <form
              onSubmit={(e) => void handleSubmitTask(e)}
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            >
              {!statusOnlyEdit && (
                <>
                  <div>
                    <label
                      htmlFor="task-code"
                      className="block text-xs font-bold text-slate-800"
                    >
                      Task Code
                    </label>
                    <input
                      id="task-code"
                      value={form.code}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          code: e.target.value,
                        }))
                      }
                      className={inputClass}
                      placeholder={`e.g. ${WORK_PACKAGE_TASK_CODE_PREFIX[workPackage]}.1`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="task-description"
                      className="block text-xs font-bold text-slate-800"
                    >
                      Task Description
                    </label>
                    <textarea
                      id="task-description"
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="task-means-of-verification"
                      className="block text-xs font-bold text-slate-800"
                    >
                      Means of Verification
                    </label>
                    <textarea
                      id="task-means-of-verification"
                      rows={3}
                      value={form.meansOfVerification}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          meansOfVerification: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </>
              )}
              {statusOnlyEdit && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Task
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {editingTask?.code
                      ? `${editingTask.code} · ${editingTask.description}`
                      : editingTask?.description || "—"}
                  </p>
                </div>
              )}
              <div>
                <label
                  htmlFor="task-status"
                  className="block text-xs font-bold text-slate-800"
                >
                  Status
                </label>
                {statusOnlyEdit && (
                  <p className="mt-0.5 text-xs font-medium text-slate-600">
                    You can set status to On-going or Submit Task.
                  </p>
                )}
                <select
                  id="task-status"
                  value={form.status}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!isTaskStatus(next)) return;
                    if (
                      statusOnlyEdit &&
                      !isTaskStatusLimitedEdit(next) &&
                      next !== editingTask?.status
                    ) {
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      status: next,
                      ...(next !== "Submitted"
                        ? { completionFile: null }
                        : {}),
                    }));
                  }}
                  className={inputClass}
                >
                  {statusSelectOptions.map((status) => (
                    <option
                      key={status}
                      value={status}
                      disabled={
                        statusOnlyEdit &&
                        !isTaskStatusLimitedEdit(status) &&
                        status !== form.status
                      }
                    >
                      {statusOnlyEdit
                        ? taskStatusLimitedEditLabel(status)
                        : status}
                    </option>
                  ))}
                </select>
              </div>
              {statusOnlyEdit && form.status === "Submitted" && (
                <>
                  <div>
                    <label
                      htmlFor="task-completion-file"
                      className="block text-xs font-bold text-slate-800"
                    >
                      Upload Task File
                    </label>
                    <input
                      id="task-completion-file"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setForm((prev) => ({
                          ...prev,
                          completionFile: file,
                        }));
                      }}
                      className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#062763]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#062763]`}
                    />
                    {form.completionFile ? (
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        Selected: {form.completionFile.name}
                      </p>
                    ) : editingTask?.completionFileName ? (
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        Current file:{" "}
                        {editingTask.completionFileUrl ? (
                          <a
                            href={editingTask.completionFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#062763] underline"
                          >
                            {editingTask.completionFileName}
                          </a>
                        ) : (
                          editingTask.completionFileName
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label
                      htmlFor="task-completion-comment"
                      className="block text-xs font-bold text-slate-800"
                    >
                      Comment <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="task-completion-comment"
                      rows={3}
                      value={form.completionComment}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          completionComment: e.target.value,
                        }))
                      }
                      className={inputClass}
                      required
                      placeholder="Describe the work completed…"
                    />
                  </div>
                </>
              )}
              {!statusOnlyEdit && (
                <div>
                  <p className="block text-xs font-bold text-slate-800">
                    Assign Lead Partners
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">
                    Select one or more users responsible for this task.
                  </p>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border-2 border-slate-300 bg-white">
                    {loadingUsers ? (
                      <p className="px-3 py-4 text-sm font-semibold text-slate-700">
                        Loading users…
                      </p>
                    ) : usersError ? (
                      <p
                        className="px-3 py-4 text-sm font-semibold text-red-700"
                        role="alert"
                      >
                        {usersError}
                      </p>
                    ) : activeUsers.length === 0 ? (
                      <p className="px-3 py-4 text-sm font-semibold text-slate-700">
                        No active users available.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {activeUsers.map((user) => {
                          const checked = form.leadPartnerIds.includes(user.id);
                          return (
                            <li key={user.id}>
                              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-[#062763]/5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleLeadPartner(user.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#062763] focus:ring-[#062763]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-slate-900">
                                    {user.name}
                                  </span>
                                  <span className="block text-xs font-medium text-slate-600">
                                    {user.role}
                                    {user.institution
                                      ? ` · ${user.institution}`
                                      : ""}
                                  </span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {form.leadPartnerIds.length > 0 && (
                    <p className="mt-1.5 text-xs font-semibold text-[#062763]">
                      {form.leadPartnerIds.length} partner
                      {form.leadPartnerIds.length === 1 ? "" : "s"} selected
                    </p>
                  )}
                </div>
              )}
              {formError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : statusOnlyEdit
                      ? form.status === "Submitted"
                        ? "Submit Task"
                        : "Save Status"
                      : editingTask
                        ? "Save Changes"
                        : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
