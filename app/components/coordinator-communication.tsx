"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CommunicationDocumentCategoryRecord } from "@/lib/communication-document-categories-service";
import type { CommunicationDocumentRecord } from "@/lib/communication-documents-service";
import {
  COMMUNICATION_DOCUMENTS_VIEW_LABELS,
  COMMUNICATION_KNOWLEDGE_SECTION_LABELS,
  parseCommunicationDocumentsView,
  parseCommunicationKnowledgeSection,
  parseCommunicationMailsView,
  COMMUNICATION_MAILS_VIEW_LABELS,
} from "@/lib/coordinator-communication-nav";
import { CommunicationApplicantMailsSection } from "./coordinator-communication-applicant-mails";
import { CommunicationScholarMailsSection } from "./coordinator-communication-scholar-mails";
import { CommunicationUserMailsSection } from "./coordinator-communication-user-mails";
import { useDashboardPortal } from "./dashboard-portal-provider";
import { formatDate } from "./coordinator-shared";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CommunicationDocumentsSection({
  canUpload,
}: {
  canUpload: boolean;
}) {
  const [documents, setDocuments] = useState<CommunicationDocumentRecord[]>(
    []
  );
  const [categories, setCategories] = useState<
    CommunicationDocumentCategoryRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [uploadSubCategory, setUploadSubCategory] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedUploadCategory = categories.find(
    (category) => category.id === uploadCategoryId
  );
  const uploadSubCategoryOptions = selectedUploadCategory?.subCategories ?? [];
  const subCategoryRequired = uploadSubCategoryOptions.length > 0;

  const selectClass =
    "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#062763] outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/communication/documents");
      const data = (await res.json()) as {
        documents?: CommunicationDocumentRecord[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load documents.");
        return;
      }
      setDocuments(data.documents ?? []);
    } catch {
      setLoadError("Could not load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/communication/document-categories");
      const data = (await res.json()) as {
        categories?: CommunicationDocumentCategoryRecord[];
      };
      if (res.ok) {
        setCategories(data.categories ?? []);
      }
    } catch {
      /* categories optional for read-only view */
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
    void loadCategories();
  }, [loadDocuments, loadCategories]);

  const resetUploadForm = () => {
    setUploadDescription("");
    setUploadCategoryId("");
    setUploadSubCategory("");
    setUploadFile(null);
    setUploadError(null);
  };

  const closeUploadModal = () => {
    if (uploading) return;
    setUploadOpen(false);
    resetUploadForm();
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError("Select a file to upload.");
      return;
    }
    if (!uploadCategoryId) {
      setUploadError("Select a document category.");
      return;
    }
    if (subCategoryRequired && !uploadSubCategory) {
      setUploadError("Select a sub-category.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("description", uploadDescription.trim());
      formData.append("categoryId", uploadCategoryId);
      if (uploadSubCategory) {
        formData.append("subCategory", uploadSubCategory);
      }

      const res = await fetch("/api/communication/documents", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        document?: CommunicationDocumentRecord;
        error?: string;
      };

      if (!res.ok) {
        setUploadError(data.error ?? "Could not upload document.");
        return;
      }

      if (data.document) {
        setDocuments((prev) => [data.document!, ...prev]);
      } else {
        await loadDocuments();
      }
      closeUploadModal();
    } catch {
      setUploadError("Could not upload document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">
          Share programme documents, templates, and reference materials with
          consortium members.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {canUpload && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              disabled={loading}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
            >
              Upload document
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {loadError && (
        <p className="mb-4 text-sm font-semibold text-red-700" role="alert">
          {loadError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-[#062763]">
            Documents ({documents.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sub-category</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded by</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    Loading documents…
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    No documents yet.
                    {canUpload ? " Upload one to get started." : ""}
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#062763]/5">
                    <td className="max-w-48 px-4 py-3 font-semibold text-slate-900">
                      {doc.description || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {doc.categoryName || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {doc.subCategory || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {doc.fileName}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <p>{doc.uploadedByName}</p>
                      <p className="text-xs font-semibold text-slate-700">
                        {doc.uploadedByEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg border-2 border-[#062763]/25 px-3 py-1.5 text-xs font-semibold text-[#062763] transition hover:bg-[#062763]/5"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-document-title"
          onClick={closeUploadModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="upload-document-title"
              className="text-base font-bold text-[#062763]"
            >
              Upload document
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              PDF, Word, Excel, JPEG, PNG, or WebP · max 10 MB
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="document-category"
                  className="block text-xs font-bold text-slate-800"
                >
                  Select document category
                </label>
                <select
                  id="document-category"
                  value={uploadCategoryId}
                  onChange={(e) => {
                    setUploadCategoryId(e.target.value);
                    setUploadSubCategory("");
                    setUploadError(null);
                  }}
                  disabled={uploading || categories.length === 0}
                  className={selectClass}
                >
                  <option value="">
                    {categories.length === 0
                      ? "No categories available"
                      : "Select a category"}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="document-subcategory"
                  className="block text-xs font-bold text-slate-800"
                >
                  Select sub-category
                </label>
                <select
                  id="document-subcategory"
                  value={uploadSubCategory}
                  onChange={(e) => {
                    setUploadSubCategory(e.target.value);
                    setUploadError(null);
                  }}
                  disabled={
                    uploading ||
                    !uploadCategoryId ||
                    uploadSubCategoryOptions.length === 0
                  }
                  className={selectClass}
                >
                  <option value="">
                    {!uploadCategoryId
                      ? "Select a category first"
                      : uploadSubCategoryOptions.length === 0
                        ? "No sub-categories for this category"
                        : "Select a sub-category"}
                  </option>
                  {uploadSubCategoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="document-description"
                  className="block text-xs font-bold text-slate-800"
                >
                  Description
                </label>
                <textarea
                  id="document-description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={uploading}
                  rows={3}
                  placeholder="Brief description of this document"
                  className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="document-file"
                  className="block text-xs font-bold text-slate-800"
                >
                  File
                </label>
                <input
                  id="document-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setUploadFile(f);
                    setUploadError(null);
                  }}
                  className="mt-1 block w-full text-sm font-medium text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-[#062763] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#062763]/90 disabled:opacity-50"
                />
                {uploadFile && (
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>
            </div>

            {uploadError && (
              <p
                className="mt-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {uploadError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={
                  uploading ||
                  !uploadFile ||
                  !uploadCategoryId ||
                  (subCategoryRequired && !uploadSubCategory)
                }
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function parseSubCategoryInput(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function CommunicationDocumentCategoriesSection({
  canManage,
}: {
  canManage: boolean;
}) {
  const [categories, setCategories] = useState<
    CommunicationDocumentCategoryRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [subCategoryInput, setSubCategoryInput] = useState("");
  const [newSubCategories, setNewSubCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<CommunicationDocumentCategoryRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubCategoryInput, setEditSubCategoryInput] = useState("");
  const [editSubCategories, setEditSubCategories] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const tableBusy = creating || updating;
  const tableColSpan = canManage ? 4 : 3;

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/communication/document-categories");
      const data = (await res.json()) as {
        categories?: CommunicationDocumentCategoryRecord[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load categories.");
        return;
      }
      setCategories(data.categories ?? []);
    } catch {
      setLoadError("Could not load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const resetCreateForm = () => {
    setNewName("");
    setSubCategoryInput("");
    setNewSubCategories([]);
    setCreateError(null);
  };

  const addSubCategoryToList = () => {
    const parsed = parseSubCategoryInput(subCategoryInput);
    if (parsed.length === 0) return;
    setNewSubCategories((prev) => {
      const next = [...prev];
      for (const item of parsed) {
        if (!next.some((x) => x.toLowerCase() === item.toLowerCase())) {
          next.push(item);
        }
      }
      return next;
    });
    setSubCategoryInput("");
    setCreateError(null);
  };

  const removeSubCategory = (item: string) => {
    setNewSubCategories((prev) => prev.filter((value) => value !== item));
  };

  const addEditSubCategoryToList = () => {
    const parsed = parseSubCategoryInput(editSubCategoryInput);
    if (parsed.length === 0) return;
    setEditSubCategories((prev) => {
      const next = [...prev];
      for (const item of parsed) {
        if (!next.some((x) => x.toLowerCase() === item.toLowerCase())) {
          next.push(item);
        }
      }
      return next;
    });
    setEditSubCategoryInput("");
    setUpdateError(null);
  };

  const removeEditSubCategory = (item: string) => {
    setEditSubCategories((prev) => prev.filter((value) => value !== item));
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setCreateError("Enter a category name.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const pendingFromInput = parseSubCategoryInput(subCategoryInput);
      const subCategories = [...newSubCategories];
      for (const item of pendingFromInput) {
        if (!subCategories.some((x) => x.toLowerCase() === item.toLowerCase())) {
          subCategories.push(item);
        }
      }

      const res = await fetch("/api/communication/document-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subCategories,
        }),
      });
      const data = (await res.json()) as {
        category?: CommunicationDocumentCategoryRecord;
        error?: string;
      };
      if (!res.ok) {
        setCreateError(data.error ?? "Could not create category.");
        return;
      }
      if (data.category) {
        setCategories((prev) =>
          [...prev, data.category!].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      } else {
        await loadCategories();
      }
      closeCreateModal();
    } catch {
      setCreateError("Could not create category.");
    } finally {
      setCreating(false);
    }
  };

  const openEditCategory = (category: CommunicationDocumentCategoryRecord) => {
    if (tableBusy) return;
    setEditingCategory(category);
    setEditName(category.name);
    setEditSubCategories([...category.subCategories]);
    setEditSubCategoryInput("");
    setUpdateError(null);
  };

  const resetEditForm = () => {
    setEditName("");
    setEditSubCategoryInput("");
    setEditSubCategories([]);
    setUpdateError(null);
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditingCategory(null);
    resetEditForm();
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const name = editName.trim();
    if (!name) {
      setUpdateError("Enter a category name.");
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    try {
      const pendingFromInput = parseSubCategoryInput(editSubCategoryInput);
      const subCategories = [...editSubCategories];
      for (const item of pendingFromInput) {
        if (!subCategories.some((x) => x.toLowerCase() === item.toLowerCase())) {
          subCategories.push(item);
        }
      }

      const res = await fetch(
        `/api/communication/document-categories/${encodeURIComponent(editingCategory.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subCategories,
          }),
        }
      );
      const data = (await res.json()) as {
        category?: CommunicationDocumentCategoryRecord;
        error?: string;
      };
      if (!res.ok) {
        setUpdateError(data.error ?? "Could not update category.");
        return;
      }
      if (data.category) {
        setCategories((prev) =>
          prev
            .map((item) =>
              item.id === data.category!.id ? data.category! : item
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        await loadCategories();
      }
      closeEditModal();
    } catch {
      setUpdateError("Could not update category.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">
          Create and organize document categories for the knowledge library.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={loading}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
            >
              New category
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadCategories()}
            disabled={loading}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {loadError && (
        <p className="mb-4 text-sm font-semibold text-red-700" role="alert">
          {loadError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-[#062763]">
            Categories ({categories.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Sub-categories</th>
                <th className="px-4 py-3">Created</th>
                {canManage && (
                  <th className="px-4 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={tableColSpan}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    Loading categories…
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColSpan}
                    className="px-4 py-10 text-center font-semibold text-slate-900"
                  >
                    No categories yet.
                    {canManage ? " Create one to get started." : ""}
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-[#062763]/5">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {category.name}
                    </td>
                    <td className="max-w-md px-4 py-3 font-medium text-slate-900">
                      {category.subCategories.length > 0 ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {category.subCategories.map((item) => (
                            <li
                              key={item}
                              className="rounded-full bg-[#e8f0ff] px-2.5 py-0.5 text-xs font-semibold text-[#062763]"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatDate(category.createdAt)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditCategory(category)}
                          disabled={tableBusy}
                          className="rounded-lg border-2 border-[#062763]/25 px-3 py-1.5 text-xs font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                        >
                          Edit category
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-category-title"
          onClick={closeCreateModal}
        >
          <form
            className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleCreateCategory(e)}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <h2
              id="create-category-title"
              className="text-base font-bold text-[#062763]"
            >
              New category
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Add a category to group communication documents.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="category-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Name
                </label>
                <input
                  id="category-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={creating}
                  required
                  placeholder="e.g. Guidelines"
                  className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                />
              </div>
              <div>
                <label
                  htmlFor="category-subcategories"
                  className="block text-xs font-bold text-slate-800"
                >
                  Add sub-categories
                </label>
                <p className="mt-0.5 text-xs font-medium text-slate-600">
                  Add one or more sub-categories. Separate multiple with commas.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    id="category-subcategories"
                    type="text"
                    value={subCategoryInput}
                    onChange={(e) => {
                      setSubCategoryInput(e.target.value);
                      setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubCategoryToList();
                      }
                    }}
                    disabled={creating}
                    placeholder="e.g. Templates, Reports"
                    className="min-w-0 flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={addSubCategoryToList}
                    disabled={creating || !subCategoryInput.trim()}
                    className="shrink-0 rounded-lg border-2 border-[#062763]/30 px-3 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {newSubCategories.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {newSubCategories.map((item) => (
                      <li key={item}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0ff] px-2.5 py-1 text-xs font-semibold text-[#062763]">
                          {item}
                          <button
                            type="button"
                            onClick={() => removeSubCategory(item)}
                            disabled={creating}
                            className="rounded-full p-0.5 hover:bg-[#062763]/15 disabled:opacity-50"
                            aria-label={`Remove ${item}`}
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {createError && (
              <p
                className="mt-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {createError}
              </p>
            )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-category-title"
          onClick={closeEditModal}
        >
          <form
            className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleUpdateCategory(e)}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <h2
                id="edit-category-title"
                className="text-base font-bold text-[#062763]"
              >
                Edit category
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Update the category name and sub-categories.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="edit-category-name"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Name
                  </label>
                  <input
                    id="edit-category-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={updating}
                    required
                    placeholder="e.g. Guidelines"
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-category-subcategories"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Add sub-categories
                  </label>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">
                    Add one or more sub-categories. Separate multiple with commas.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="edit-category-subcategories"
                      type="text"
                      value={editSubCategoryInput}
                      onChange={(e) => {
                        setEditSubCategoryInput(e.target.value);
                        setUpdateError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEditSubCategoryToList();
                        }
                      }}
                      disabled={updating}
                      placeholder="e.g. Templates, Reports"
                      className="min-w-0 flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={addEditSubCategoryToList}
                      disabled={updating || !editSubCategoryInput.trim()}
                      className="shrink-0 rounded-lg border-2 border-[#062763]/30 px-3 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  {editSubCategories.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {editSubCategories.map((item) => (
                        <li key={item}>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0ff] px-2.5 py-1 text-xs font-semibold text-[#062763]">
                            {item}
                            <button
                              type="button"
                              onClick={() => removeEditSubCategory(item)}
                              disabled={updating}
                              className="rounded-full p-0.5 hover:bg-[#062763]/15 disabled:opacity-50"
                              aria-label={`Remove ${item}`}
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {updateError && (
                <p
                  className="mt-3 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {updateError}
                </p>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-6 pt-4">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={updating}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {updating ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function CoordinatorCommunication() {
  const searchParams = useSearchParams();
  const { portalKey } = useDashboardPortal();
  const sectionParam = searchParams.get("section");
  const activeSection = parseCommunicationKnowledgeSection(sectionParam);
  const documentsView = parseCommunicationDocumentsView(
    searchParams.get("view")
  );
  const mailsView = parseCommunicationMailsView(searchParams.get("view"));
  const pageTitle =
    activeSection === "documents"
      ? COMMUNICATION_DOCUMENTS_VIEW_LABELS[documentsView]
      : activeSection === "mails"
        ? COMMUNICATION_MAILS_VIEW_LABELS[mailsView]
        : COMMUNICATION_KNOWLEDGE_SECTION_LABELS[activeSection];
  const canUploadDocuments =
    portalKey === "coordinator" || portalKey === "administrator";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {pageTitle}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            Communication &amp; Knowledge · SMECC2E coordination
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        {activeSection === "documents" && documentsView === "categories" ? (
          <CommunicationDocumentCategoriesSection
            canManage={canUploadDocuments}
          />
        ) : activeSection === "documents" ? (
          <CommunicationDocumentsSection canUpload={canUploadDocuments} />
        ) : activeSection === "mails" && mailsView === "applicants" ? (
          <CommunicationApplicantMailsSection canSend={canUploadDocuments} />
        ) : activeSection === "mails" && mailsView === "scholars" ? (
          <CommunicationScholarMailsSection canSend={canUploadDocuments} />
        ) : activeSection === "mails" && mailsView === "users" ? (
          <CommunicationUserMailsSection canSend={canUploadDocuments} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-slate-800">
              {pageTitle} content and publishing tools will be available here.
              Use the sidebar flyout under{" "}
              <strong className="text-[#062763]">
                Communication &amp; Knowledge
              </strong>{" "}
              to switch between areas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
