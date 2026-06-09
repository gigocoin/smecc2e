"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardUser } from "@/lib/dashboard-users";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

async function uploadProfileImage(
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
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete?: string;
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
          autoComplete={autoComplete}
          className="w-full rounded-lg border-2 border-slate-300 bg-white py-2 pl-3 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-[#062763] disabled:opacity-50"
          aria-label={
            visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
          }
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}

export function DashboardSettings() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const profilePreviewRef = useRef<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as {
        user?: DashboardUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setLoadError(data.error ?? "Could not load your account.");
        return;
      }
      setUser(data.user);
      setProfilePreview(data.user.profileImageUrl);
    } catch {
      setLoadError("Could not load your account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const clearPendingPhoto = useCallback(() => {
    revokeBlobUrl(profilePreviewRef.current);
    profilePreviewRef.current = null;
    setProfileImageFile(null);
    setRemovePhoto(false);
    if (user) setProfilePreview(user.profileImageUrl);
  }, [user]);

  const handlePhotoFileSelect = (file: File, previewUrl: string) => {
    revokeBlobUrl(profilePreviewRef.current);
    profilePreviewRef.current = previewUrl;
    setProfileImageFile(file);
    setRemovePhoto(false);
    setProfilePreview(previewUrl);
    setPhotoMessage(null);
  };

  const handleRemovePhoto = () => {
    revokeBlobUrl(profilePreviewRef.current);
    profilePreviewRef.current = null;
    setProfileImageFile(null);
    setRemovePhoto(true);
    setProfilePreview(null);
    setPhotoMessage(null);
  };

  const photoDirty =
    profileImageFile !== null ||
    removePhoto ||
    profilePreview !== (user?.profileImageUrl ?? null);

  const handleSavePhoto = async () => {
    if (!user || !photoDirty) return;
    setSavingPhoto(true);
    setPhotoMessage(null);

    try {
      let profileImageUrl: string | null = user.profileImageUrl;

      if (profileImageFile) {
        const uploaded = await uploadProfileImage(profileImageFile);
        if ("error" in uploaded) {
          setPhotoMessage({ type: "error", text: uploaded.error });
          return;
        }
        profileImageUrl = uploaded.url;
      } else if (removePhoto) {
        profileImageUrl = null;
      }

      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImageUrl }),
      });
      const data = (await res.json()) as {
        user?: DashboardUser;
        error?: string;
      };

      if (!res.ok || !data.user) {
        setPhotoMessage({
          type: "error",
          text: data.error ?? "Could not save profile photo.",
        });
        return;
      }

      setUser(data.user);
      revokeBlobUrl(profilePreviewRef.current);
      profilePreviewRef.current = null;
      setProfileImageFile(null);
      setRemovePhoto(false);
      setProfilePreview(data.user.profileImageUrl);
      setPhotoMessage({ type: "success", text: "Profile photo updated." });
    } catch {
      setPhotoMessage({
        type: "error",
        text: "Could not save profile photo.",
      });
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Enter your current password.",
      });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage({
        type: "error",
        text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New passwords do not match.",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setPasswordMessage({
          type: "error",
          text: data.error ?? "Could not change password.",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully.",
      });
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Could not change password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-600">
        Loading settings…
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError ?? "Could not load your account."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#062763]">Settings</h1>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Update your profile photo and password.
        </p>
      </div>

      <div className="mx-auto max-w-xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Profile photo
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            JPEG, PNG, WebP, or GIF. Max 2 MB.
          </p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <label
              className={`relative block ${savingPhoto ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#062763]/40 bg-[#e8f0ff] transition hover:border-[#062763] hover:bg-[#dde8fc]">
                {profilePreview ? (
                  <Image
                    src={profilePreview}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span
                    className="text-3xl font-light leading-none text-[#062763]"
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
                disabled={savingPhoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handlePhotoFileSelect(file, URL.createObjectURL(file));
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-center text-xs font-semibold text-slate-600">
              {profilePreview ? "Tap circle to change photo" : "Upload profile photo"}
            </p>
            {profilePreview && !savingPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Remove photo
              </button>
            )}
          </div>

          {photoMessage && (
            <p
              className={`mt-4 text-center text-sm font-semibold ${
                photoMessage.type === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {photoMessage.text}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {photoDirty && (
              <button
                type="button"
                onClick={clearPendingPhoto}
                disabled={savingPhoto}
                className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSavePhoto()}
              disabled={!photoDirty || savingPhoto}
              className="rounded-lg border-2 border-[#062763] bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
            >
              {savingPhoto ? "Saving…" : "Save photo"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
            Change password
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Use at least {MIN_PASSWORD_LENGTH} characters for your new password.
          </p>

          <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
            <PasswordInput
              id="current-password"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              disabled={savingPassword}
              visible={showCurrentPassword}
              onToggleVisible={() => setShowCurrentPassword((v) => !v)}
              autoComplete="current-password"
            />
            <PasswordInput
              id="new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password"
              disabled={savingPassword}
              visible={showNewPassword}
              onToggleVisible={() => setShowNewPassword((v) => !v)}
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter new password"
              disabled={savingPassword}
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword((v) => !v)}
              autoComplete="new-password"
            />

            {passwordMessage && (
              <p
                className={`text-sm font-semibold ${
                  passwordMessage.type === "success"
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {passwordMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={
                savingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="w-full rounded-lg border-2 border-[#062763] bg-[#062763] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a3580] disabled:opacity-50"
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{user.name}</p>
          <p>{user.email}</p>
          <p className="text-xs text-slate-500">
            Name and email can only be changed by an administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
