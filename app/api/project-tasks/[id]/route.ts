import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  AuthError,
  requireCoordinatorSessionUser,
  requireDashboardSessionUser,
} from "@/lib/auth-service";
import { isTaskStatusLimitedEdit } from "@/lib/project-tasks";
import {
  approveProjectTaskSubmission,
  deleteProjectTask,
  duplicateProjectTask,
  isLeadPartnerOnProjectTask,
  updateProjectTask,
  type UpdateProjectTaskInput,
} from "@/lib/project-tasks-service";
import { toUserFacingDatabaseError } from "@/lib/prisma-errors";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_COMPLETION_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_COMPLETION_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_COMPLETION_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xlsx",
  "xls",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

function hasNonStatusTaskFields(body: UpdateProjectTaskInput): boolean {
  return (
    body.code !== undefined ||
    body.description !== undefined ||
    body.meansOfVerification !== undefined ||
    body.leadPartnerIds !== undefined
  );
}

function fileExtension(name: string): string {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.ms-excel":
      return "xls";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function isAllowedCompletionUpload(file: File): boolean {
  if (ALLOWED_COMPLETION_TYPES.has(file.type)) return true;
  return ALLOWED_COMPLETION_EXTENSIONS.has(fileExtension(file.name));
}

function sanitizeOriginalName(name: string): string {
  return name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120);
}

async function saveCompletionFile(
  taskId: string,
  file: File
): Promise<{ fileName: string; fileUrl: string }> {
  if (!isAllowedCompletionUpload(file)) {
    throw new Error("Use PDF, Word, Excel, JPEG, PNG, or WebP");
  }
  if (file.size > MAX_COMPLETION_FILE_BYTES) {
    throw new Error("File must be 10 MB or smaller");
  }

  const mimeExt = extensionForMime(file.type);
  const ext =
    mimeExt !== "bin" ? mimeExt : fileExtension(file.name) || "bin";
  const storedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "project-tasks",
    taskId
  );
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, storedName), buffer);

  return {
    fileName: sanitizeOriginalName(file.name),
    fileUrl: `/uploads/project-tasks/${taskId}/${storedName}`,
  };
}

async function parseStatusOnlyBody(
  request: Request,
  taskId: string
): Promise<UpdateProjectTaskInput> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const statusRaw = formData.get("status");
    const commentRaw = formData.get("completionComment");
    const file = formData.get("file");

    const update: UpdateProjectTaskInput = {
      status: typeof statusRaw === "string" ? statusRaw : undefined,
    };

    if (typeof commentRaw === "string") {
      update.completionComment = commentRaw;
    }

    if (file instanceof File && file.size > 0) {
      const saved = await saveCompletionFile(taskId, file);
      update.completionFileName = saved.fileName;
      update.completionFileUrl = saved.fileUrl;
    }

    return update;
  }

  return (await request.json()) as UpdateProjectTaskInput;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireDashboardSessionUser();
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let body: UpdateProjectTaskInput & {
      duplicate?: boolean;
      approve?: boolean;
    };
    if (isMultipart) {
      body = await parseStatusOnlyBody(request, id);
    } else {
      body = (await request.json()) as UpdateProjectTaskInput & {
        duplicate?: boolean;
        approve?: boolean;
      };
    }

    const isCoordinator = user.role === "Coordinator";
    const canEditStatusOnly =
      user.role === "Administrator" || user.role === "Evaluator";

    if (body.duplicate === true) {
      if (!isCoordinator) {
        throw new AuthError("Forbidden", 403);
      }
      const task = await duplicateProjectTask(id);
      if (!task) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ task }, { status: 201 });
    }

    if (body.approve === true) {
      if (!isCoordinator) {
        throw new AuthError("Forbidden", 403);
      }
      const task = await approveProjectTaskSubmission(id);
      if (!task) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ task });
    }

    if (!isCoordinator) {
      if (!canEditStatusOnly) {
        throw new AuthError("Forbidden", 403);
      }
      if (hasNonStatusTaskFields(body) || body.status === undefined) {
        return NextResponse.json(
          {
            error:
              'Administrators and evaluators may only update status to "On-going" or "Submit Task".',
          },
          { status: 403 }
        );
      }
      if (!isTaskStatusLimitedEdit(String(body.status))) {
        return NextResponse.json(
          {
            error:
              'Administrators and evaluators may only set status to "On-going" or "Submit Task".',
          },
          { status: 400 }
        );
      }
      const assigned = await isLeadPartnerOnProjectTask(id, user.id);
      if (!assigned) {
        return NextResponse.json(
          {
            error:
              "You can only update the status of tasks assigned to you as a lead partner.",
          },
          { status: 403 }
        );
      }

      if (body.status === "Submitted") {
        const comment = String(body.completionComment ?? "").trim();
        if (!comment) {
          return NextResponse.json(
            { error: "Enter a completion comment." },
            { status: 400 }
          );
        }

        const task = await updateProjectTask(id, {
          status: body.status,
          completionComment: comment,
          ...(body.completionFileUrl
            ? {
                completionFileName: body.completionFileName,
                completionFileUrl: body.completionFileUrl,
              }
            : {}),
        });
        if (!task) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ task });
      }

      const task = await updateProjectTask(id, { status: body.status });
      if (!task) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ task });
    }

    const task = await updateProjectTask(id, body);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("PATCH /api/project-tasks/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update task";
    const isClientError =
      /file|comment|pdf|word|excel|jpeg|png|webp|mb or smaller|submitted tasks/i.test(
        message
      );
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireCoordinatorSessionUser();
    const { id } = await context.params;
    const deleted = await deleteProjectTask(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.status === 403 ? "Forbidden" : "Unauthorized" },
        { status: err.status }
      );
    }
    console.error("DELETE /api/project-tasks/[id]", err);
    const connectionError = toUserFacingDatabaseError(err);
    return NextResponse.json(
      { error: connectionError ?? "Failed to delete task" },
      { status: connectionError ? 503 : 500 }
    );
  }
}
