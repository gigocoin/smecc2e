"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { DashboardUser } from "@/lib/dashboard-users";
import { useDashboardPortal } from "./dashboard-portal-provider";
import {
  MIN_PASSWORD_LENGTH,
  passwordLengthError,
} from "@/lib/password-policy";

const USER_ROLES: DashboardUser["role"][] = [
  "Coordinator",
  "Evaluator",
  "Administrator",
];

const USER_STATUSES: DashboardUser["status"][] = ["Active", "Inactive"];

function defaultInstitution(options: string[]): string {
  return options[0] ?? "";
}

type CoordinatorUserFormState = {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  institution: string;
  role: DashboardUser["role"];
  status: DashboardUser["status"];
};

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const actionBtnClass =
  "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

async function uploadUserProfileImage(
  file: File
): Promise<{ url: string } | { error: string }> {
  const uploadData = new FormData();
  uploadData.append("file", file);
  const uploadRes = await fetch("/api/users/upload-image", {
    method: "POST",
    body: uploadData,
  });
  const uploadJson = (await uploadRes.json()) as {
    url?: string;
    error?: string;
  };
  if (!uploadRes.ok || !uploadJson.url) {
    return { error: uploadJson.error ?? "Could not upload profile image." };
  }
  return { url: uploadJson.url };
}

function revokeBlobUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858 5.858a3 3 0 104.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5"
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

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  visible,
  onToggleVisible,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-800">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="new-password"
          className="w-full rounded-lg border-2 border-slate-300 bg-white py-2 pl-3 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-[#062763] disabled:opacity-50"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}

function ProfileImageUploadCircle({
  preview,
  disabled,
  onFileSelect,
  onClear,
}: {
  preview: string | null;
  disabled: boolean;
  onFileSelect: (file: File, previewUrl: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label
        className={`relative block ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#062763]/40 bg-[#e8f0ff] transition hover:border-[#062763] hover:bg-[#dde8fc]">
          {preview ? (
            <Image
              src={preview}
              alt="Profile preview"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span
              className="text-4xl font-light leading-none text-[#062763]"
              aria-hidden
            >
              +
            </span>
          )}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileSelect(file, URL.createObjectURL(file));
            }
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-center text-xs font-semibold text-slate-600">
        {preview ? "Tap circle to change photo" : "Upload profile photo"}
      </p>
      {preview && !disabled && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-red-600 hover:underline"
        >
          Remove photo
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DashboardUser["status"] }) {
  const active = status === "Active";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-900"
          : "bg-slate-200 text-slate-800"
      }`}
    >
      {status}
    </span>
  );
}

function userInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function UserAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[#e8f0ff] text-sm font-bold text-[#062763]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <span aria-label={name}>{userInitials(name)}</span>
      )}
    </span>
  );
}

export function CoordinatorUsers({
  initialUsers = [],
  initialLoadError = null,
  initialInstitutions = [],
}: {
  initialUsers?: DashboardUser[];
  initialLoadError?: string | null;
  initialInstitutions?: string[];
}) {
  const { portalKey } = useDashboardPortal();
  const defaultCreateRole: DashboardUser["role"] =
    portalKey === "administrator" ? "Evaluator" : "Coordinator";
  const createUserRoles: DashboardUser["role"][] =
    portalKey === "administrator" ? ["Evaluator"] : USER_ROLES;
  const canManageExistingUsers = portalKey === "coordinator";
  const canCreateUsers =
    portalKey === "coordinator" || portalKey === "administrator";

  const [users, setUsers] = useState<DashboardUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const profilePreviewRef = useRef<string | null>(null);
  const [form, setForm] = useState<CoordinatorUserFormState>({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    institution: defaultInstitution(initialInstitutions),
    role: defaultCreateRole,
    status: "Active" as DashboardUser["status"],
  });
  const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editShowConfirmPassword, setEditShowConfirmPassword] = useState(false);
  const [editProfilePreview, setEditProfilePreview] = useState<string | null>(
    null
  );
  const [editProfileFile, setEditProfileFile] = useState<File | null>(null);
  const [editProfileRemoved, setEditProfileRemoved] = useState(false);
  const editProfilePreviewRef = useRef<string | null>(null);
  const [editForm, setEditForm] = useState<CoordinatorUserFormState>({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    institution: defaultInstitution(initialInstitutions),
    role: "Coordinator" as DashboardUser["role"],
    status: "Active" as DashboardUser["status"],
  });
  const [deletingUser, setDeletingUser] = useState<DashboardUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const tableBusy = creating || updating || deleting;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Failed to load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setLoadError("Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearProfileImage = useCallback(() => {
    if (profilePreviewRef.current) {
      URL.revokeObjectURL(profilePreviewRef.current);
      profilePreviewRef.current = null;
    }
    setProfilePreview(null);
    setProfileImageFile(null);
  }, []);

  const resetCreateForm = () => {
    setForm({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      institution: defaultInstitution(initialInstitutions),
      role: defaultCreateRole,
      status: "Active",
    });
    setCreateError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    clearProfileImage();
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setCreateError("Enter a name.");
      return;
    }
    if (!form.email.trim()) {
      setCreateError("Enter an email address.");
      return;
    }
    if (!form.phoneNumber.trim()) {
      setCreateError("Enter a phone number.");
      return;
    }
    if (!form.institution.trim()) {
      setCreateError("Select or enter an institution.");
      return;
    }
    const passwordError = passwordLengthError(form.password);
    if (passwordError) {
      setCreateError(passwordError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      let profileImageUrl: string | null = null;
      if (profileImageFile) {
        const uploaded = await uploadUserProfileImage(profileImageFile);
        if ("error" in uploaded) {
          setCreateError(uploaded.error);
          return;
        }
        profileImageUrl = uploaded.url;
      }

      const { confirmPassword: _confirm, ...payload } = form;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, profileImageUrl }),
      });
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setCreateError(data.error ?? "Could not create user.");
        return;
      }
      if (data.users) setUsers(data.users);
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      setCreateError("Could not create user.");
    } finally {
      setCreating(false);
    }
  };

  const clearEditProfileImage = useCallback(() => {
    revokeBlobUrl(editProfilePreviewRef.current);
    editProfilePreviewRef.current = null;
    setEditProfilePreview(null);
    setEditProfileFile(null);
    setEditProfileRemoved(true);
  }, []);

  const resetEditForm = useCallback(() => {
    setEditForm({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      institution: defaultInstitution(initialInstitutions),
      role: "Coordinator",
      status: "Active",
    });
    setEditError(null);
    setEditShowPassword(false);
    setEditShowConfirmPassword(false);
    revokeBlobUrl(editProfilePreviewRef.current);
    editProfilePreviewRef.current = null;
    setEditProfilePreview(null);
    setEditProfileFile(null);
    setEditProfileRemoved(false);
  }, [initialInstitutions]);

  const openEdit = (user: DashboardUser) => {
    if (tableBusy) return;
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: "",
      confirmPassword: "",
      institution: user.institution,
      role: user.role,
      status: user.status,
    });
    setEditError(null);
    setEditShowPassword(false);
    setEditShowConfirmPassword(false);
    setEditProfilePreview(user.profileImageUrl);
    setEditProfileFile(null);
    setEditProfileRemoved(false);
    editProfilePreviewRef.current = null;
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditingUser(null);
    resetEditForm();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.name.trim()) {
      setEditError("Enter a name.");
      return;
    }
    if (!editForm.email.trim()) {
      setEditError("Enter an email address.");
      return;
    }
    if (!editForm.phoneNumber.trim()) {
      setEditError("Enter a phone number.");
      return;
    }
    if (!editForm.institution.trim()) {
      setEditError("Select or enter an institution.");
      return;
    }
    if (editForm.password || editForm.confirmPassword) {
      const passwordError = passwordLengthError(editForm.password);
      if (passwordError) {
        setEditError(passwordError);
        return;
      }
      if (editForm.password !== editForm.confirmPassword) {
        setEditError("Passwords do not match.");
        return;
      }
    }

    setUpdating(true);
    setEditError(null);
    try {
      let profileImageUrl: string | null = editingUser.profileImageUrl;
      if (editProfileFile) {
        const uploaded = await uploadUserProfileImage(editProfileFile);
        if ("error" in uploaded) {
          setEditError(uploaded.error);
          return;
        }
        profileImageUrl = uploaded.url;
      } else if (editProfileRemoved) {
        profileImageUrl = null;
      }

      const { confirmPassword: _confirm, ...fields } = editForm;
      const payload: Record<string, unknown> = {
        ...fields,
        profileImageUrl,
      };
      if (!editForm.password.trim()) {
        delete payload.password;
      }

      const res = await fetch(
        `/api/users/${encodeURIComponent(editingUser.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setEditError(data.error ?? "Could not update user.");
        return;
      }
      if (data.users) setUsers(data.users);
      setEditingUser(null);
      resetEditForm();
    } catch {
      setEditError("Could not update user.");
    } finally {
      setUpdating(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingUser(null);
    setDeleteError(null);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(deletingUser.id)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as {
        users?: DashboardUser[];
        error?: string;
      };
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete user.");
        return;
      }
      if (data.users) setUsers(data.users);
      setDeletingUser(null);
    } catch {
      setDeleteError("Could not delete user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">Users</h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            SMECC2E mobility & scholarship coordination
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canCreateUsers && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
            >
              Create user
            </button>
          )}
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-[#062763]">
              Coordination team ({users.length})
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Users with access to review applications and manage the programme.
            </p>
            {loadError && (
              <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
                {loadError}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  {canManageExistingUsers && (
                    <th className="px-5 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManageExistingUsers ? 7 : 6}
                      className="px-5 py-10 text-center font-semibold text-slate-900"
                    >
                      No users yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            imageUrl={user.profileImageUrl}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {user.name}
                            </p>
                            <p className="text-xs font-semibold text-slate-800">
                              {user.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">
                        {user.phoneNumber}
                      </td>
                      <td className="max-w-xs px-5 py-3 font-medium text-slate-900">
                        {user.institution}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {user.role}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      {canManageExistingUsers && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(user)}
                              disabled={tableBusy}
                              className={`${actionBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingUser(user);
                                setDeleteError(null);
                              }}
                              disabled={tableBusy}
                              className={`${actionBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
          onClick={closeCreateModal}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="create-user-title"
              className="text-base font-bold text-[#062763]"
            >
              Create user
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Add a coordination team member with dashboard access.
            </p>
            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <ProfileImageUploadCircle
                preview={profilePreview}
                disabled={creating}
                onFileSelect={(file, previewUrl) => {
                  if (profilePreviewRef.current) {
                    URL.revokeObjectURL(profilePreviewRef.current);
                  }
                  profilePreviewRef.current = previewUrl;
                  setProfilePreview(previewUrl);
                  setProfileImageFile(file);
                  setCreateError(null);
                }}
                onClear={clearProfileImage}
              />
              <div>
                <label
                  htmlFor="user-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Full name
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setCreateError(null);
                  }}
                  placeholder="e.g. Dr. Jane Doe"
                  disabled={creating}
                  autoFocus
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="user-email"
                  className="block text-xs font-bold text-slate-800"
                >
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    setCreateError(null);
                  }}
                  placeholder="name@institution.edu"
                  disabled={creating}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="user-phone"
                  className="block text-xs font-bold text-slate-800"
                >
                  Phone number
                </label>
                <input
                  id="user-phone"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phoneNumber: e.target.value }));
                    setCreateError(null);
                  }}
                  placeholder="+234 803 000 0000"
                  disabled={creating}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordInput
                  id="user-password"
                  label="Password"
                  value={form.password}
                  onChange={(password) => {
                    setForm((f) => ({ ...f, password }));
                    setCreateError(null);
                  }}
                  placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
                  disabled={creating}
                  visible={showPassword}
                  onToggleVisible={() => setShowPassword((v) => !v)}
                />
                <PasswordInput
                  id="user-confirm-password"
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChange={(confirmPassword) => {
                    setForm((f) => ({ ...f, confirmPassword }));
                    setCreateError(null);
                  }}
                  placeholder="Re-enter password"
                  disabled={creating}
                  visible={showConfirmPassword}
                  onToggleVisible={() => setShowConfirmPassword((v) => !v)}
                />
              </div>
              <div>
                <label
                  htmlFor="user-institution"
                  className="block text-xs font-bold text-slate-800"
                >
                  Institution
                </label>
                <select
                  id="user-institution"
                  value={form.institution}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, institution: e.target.value }));
                    setCreateError(null);
                  }}
                  disabled={creating}
                  className={inputClass}
                >
                  {!form.institution && (
                    <option value="" disabled>
                      Select an institution
                    </option>
                  )}
                  {initialInstitutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-role"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Role
                  </label>
                  <select
                    id="user-role"
                    value={form.role}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        role: e.target.value as DashboardUser["role"],
                      }));
                      setCreateError(null);
                    }}
                    disabled={creating}
                    className={inputClass}
                  >
                    {createUserRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="user-status"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Status
                  </label>
                  <select
                    id="user-status"
                    value={form.status}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as DashboardUser["status"],
                      }));
                      setCreateError(null);
                    }}
                    disabled={creating}
                    className={inputClass}
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {createError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {createError}
                </p>
              )}
              <div className="flex justify-end gap-2">
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
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
          onClick={closeEditModal}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="edit-user-title"
              className="text-base font-bold text-[#062763]"
            >
              Edit user
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Update {editingUser.id} — leave password blank to keep it unchanged.
            </p>
            <form onSubmit={handleUpdateUser} className="mt-5 space-y-4">
              <ProfileImageUploadCircle
                preview={editProfilePreview}
                disabled={updating}
                onFileSelect={(file, previewUrl) => {
                  revokeBlobUrl(editProfilePreviewRef.current);
                  editProfilePreviewRef.current = previewUrl;
                  setEditProfilePreview(previewUrl);
                  setEditProfileFile(file);
                  setEditProfileRemoved(false);
                  setEditError(null);
                }}
                onClear={clearEditProfileImage}
              />
              <div>
                <label
                  htmlFor="edit-user-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Full name
                </label>
                <input
                  id="edit-user-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm((f) => ({ ...f, name: e.target.value }));
                    setEditError(null);
                  }}
                  disabled={updating}
                  autoFocus
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-user-email"
                  className="block text-xs font-bold text-slate-800"
                >
                  Email
                </label>
                <input
                  id="edit-user-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => {
                    setEditForm((f) => ({ ...f, email: e.target.value }));
                    setEditError(null);
                  }}
                  disabled={updating}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-user-phone"
                  className="block text-xs font-bold text-slate-800"
                >
                  Phone number
                </label>
                <input
                  id="edit-user-phone"
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => {
                    setEditForm((f) => ({
                      ...f,
                      phoneNumber: e.target.value,
                    }));
                    setEditError(null);
                  }}
                  disabled={updating}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordInput
                  id="edit-user-password"
                  label="New password (optional)"
                  value={editForm.password}
                  onChange={(password) => {
                    setEditForm((f) => ({ ...f, password }));
                    setEditError(null);
                  }}
                  placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
                  disabled={updating}
                  visible={editShowPassword}
                  onToggleVisible={() => setEditShowPassword((v) => !v)}
                />
                <PasswordInput
                  id="edit-user-confirm-password"
                  label="Confirm new password"
                  value={editForm.confirmPassword}
                  onChange={(confirmPassword) => {
                    setEditForm((f) => ({ ...f, confirmPassword }));
                    setEditError(null);
                  }}
                  placeholder="Re-enter if changing"
                  disabled={updating}
                  visible={editShowConfirmPassword}
                  onToggleVisible={() =>
                    setEditShowConfirmPassword((v) => !v)
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="edit-user-institution"
                  className="block text-xs font-bold text-slate-800"
                >
                  Institution
                </label>
                <select
                  id="edit-user-institution"
                  value={editForm.institution}
                  onChange={(e) => {
                    setEditForm((f) => ({
                      ...f,
                      institution: e.target.value,
                    }));
                    setEditError(null);
                  }}
                  disabled={updating}
                  className={inputClass}
                >
                  {initialInstitutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                  {!initialInstitutions.includes(editForm.institution) &&
                    editForm.institution && (
                    <option value={editForm.institution}>
                      {editForm.institution}
                    </option>
                  )}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-user-role"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Role
                  </label>
                  <select
                    id="edit-user-role"
                    value={editForm.role}
                    onChange={(e) => {
                      setEditForm((f) => ({
                        ...f,
                        role: e.target.value as DashboardUser["role"],
                      }));
                      setEditError(null);
                    }}
                    disabled={updating}
                    className={inputClass}
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-user-status"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Status
                  </label>
                  <select
                    id="edit-user-status"
                    value={editForm.status}
                    onChange={(e) => {
                      setEditForm((f) => ({
                        ...f,
                        status: e.target.value as DashboardUser["status"],
                      }));
                      setEditError(null);
                    }}
                    disabled={updating}
                    className={inputClass}
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {editError}
                </p>
              )}
              <div className="flex justify-end gap-2">
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
        </div>
      )}

      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-user-title"
              className="text-base font-bold text-red-800"
            >
              Delete user
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Remove <strong>{deletingUser.name}</strong> ({deletingUser.id})?
              This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
