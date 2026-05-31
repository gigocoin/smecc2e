"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicationRecord } from "@/lib/application-types";
import { parseCountriesInput, type RegionRecord } from "@/lib/regions";

const actionIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-50";

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

export function CoordinatorRegions({
  hideEditDelete = false,
}: {
  hideEditDelete?: boolean;
} = {}) {
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionsLoadError, setRegionsLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [newCountries, setNewCountries] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingRegion, setEditingRegion] = useState<RegionRecord | null>(null);
  const [editRegionName, setEditRegionName] = useState("");
  const [editCountryInput, setEditCountryInput] = useState("");
  const [editCountries, setEditCountries] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deletingRegion, setDeletingRegion] = useState<RegionRecord | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const tableBusy = creating || updating || deleting;

  const loadRegions = useCallback(async () => {
    try {
      const res = await fetch("/api/regions", { cache: "no-store" });
      const data = (await res.json()) as {
        regions?: RegionRecord[];
        error?: string;
      };
      if (!res.ok) {
        setRegionsLoadError(data.error ?? "Failed to load regions.");
        return;
      }
      setRegionsLoadError(null);
      setRegions(data.regions ?? []);
    } catch {
      setRegionsLoadError("Failed to load regions.");
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) return;
      const data = (await res.json()) as { applications: ApplicationRecord[] };
      setApplications(data.applications);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRegions(), loadApplications()]);
  }, [loadRegions, loadApplications]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const regionStats = useMemo(() => {
    return regions.map((region) => {
      const apps = applications.filter((a) => a.region === region.name);
      return {
        region,
        total: apps.length,
        approved: apps.filter((a) => a.status === "approved").length,
        underReview: apps.filter((a) => a.status === "under_review").length,
        pending: apps.filter((a) => a.status === "pending").length,
      };
    });
  }, [applications, regions]);

  const addCountryToList = () => {
    const parsed = parseCountriesInput(countryInput);
    if (parsed.length === 0) return;
    setNewCountries((prev) => {
      const next = [...prev];
      for (const c of parsed) {
        if (!next.some((x) => x.toLowerCase() === c.toLowerCase())) {
          next.push(c);
        }
      }
      return next;
    });
    setCountryInput("");
    setCreateError(null);
  };

  const removeCountry = (country: string) => {
    setNewCountries((prev) => prev.filter((c) => c !== country));
  };

  const addEditCountryToList = () => {
    const parsed = parseCountriesInput(editCountryInput);
    if (parsed.length === 0) return;
    setEditCountries((prev) => {
      const next = [...prev];
      for (const c of parsed) {
        if (!next.some((x) => x.toLowerCase() === c.toLowerCase())) {
          next.push(c);
        }
      }
      return next;
    });
    setEditCountryInput("");
    setUpdateError(null);
  };

  const removeEditCountry = (country: string) => {
    setEditCountries((prev) => prev.filter((c) => c !== country));
  };

  const resetCreateForm = () => {
    setNewRegionName("");
    setCountryInput("");
    setNewCountries([]);
    setCreateError(null);
  };

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRegionName.trim();
    if (!name) {
      setCreateError("Enter a region name.");
      return;
    }
    const pendingFromInput = parseCountriesInput(countryInput);
    const countries = [...newCountries];
    for (const c of pendingFromInput) {
      if (!countries.some((x) => x.toLowerCase() === c.toLowerCase())) {
        countries.push(c);
      }
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name, countries }),
      });
      const data = (await res.json()) as {
        regions?: RegionRecord[];
        error?: string;
      };
      if (!res.ok) {
        setCreateError(data.error ?? "Could not create region.");
        return;
      }
      if (data.regions) setRegions(data.regions);
      resetCreateForm();
      setCreateOpen(false);
    } catch {
      setCreateError("Could not create region.");
    } finally {
      setCreating(false);
    }
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const openEdit = (region: RegionRecord) => {
    if (tableBusy) return;
    setEditingRegion(region);
    setEditRegionName(region.name);
    setEditCountries([...region.countries]);
    setEditCountryInput("");
    setUpdateError(null);
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditingRegion(null);
    setEditRegionName("");
    setEditCountryInput("");
    setEditCountries([]);
    setUpdateError(null);
  };

  const handleUpdateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegion) return;
    const name = editRegionName.trim();
    if (!name) {
      setUpdateError("Enter a region name.");
      return;
    }
    const pendingFromInput = parseCountriesInput(editCountryInput);
    const countries = [...editCountries];
    for (const c of pendingFromInput) {
      if (!countries.some((x) => x.toLowerCase() === c.toLowerCase())) {
        countries.push(c);
      }
    }
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/regions/${encodeURIComponent(editingRegion.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name, countries }),
      });
      const data = (await res.json()) as {
        regions?: RegionRecord[];
        error?: string;
      };
      if (!res.ok) {
        setUpdateError(data.error ?? "Could not update region.");
        return;
      }
      if (data.regions) setRegions(data.regions);
      closeEditModal();
    } catch {
      setUpdateError("Could not update region.");
    } finally {
      setUpdating(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingRegion(null);
    setDeleteError(null);
  };

  const handleDeleteRegion = async () => {
    if (!deletingRegion) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/regions/${encodeURIComponent(deletingRegion.id)}`,
        { method: "DELETE", cache: "no-store" }
      );
      const data = (await res.json()) as {
        regions?: RegionRecord[];
        error?: string;
      };
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete region.");
        return;
      }
      if (data.regions) setRegions(data.regions);
      closeDeleteModal();
    } catch {
      setDeleteError("Could not delete region.");
    } finally {
      setDeleting(false);
    }
  };

  const formatCountries = (countries: string[]) =>
    countries.length > 0 ? countries.join(", ") : "—";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-lg font-bold text-[#062763] sm:text-xl">Regions</h1>
          <p className="text-sm font-semibold text-slate-800">
            SMECC2E mobility & scholarship coordination
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90"
          >
            Create region
          </button>
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regionStats.map(({ region, total, approved }, index) => (
              <div
                key={region.id}
                className="region-stat-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <h2 className="text-base font-bold text-[#062763]">
                  {region.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-700">
                  {formatCountries(region.countries)}
                </p>
                <p className="mt-3 text-3xl font-bold text-[#062763] tabular-nums">
                  {loading ? "—" : total}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Applicants
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  {loading
                    ? "—"
                    : `${approved} approved scholar${approved === 1 ? "" : "s"}`}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-[#062763]">
                Regional breakdown
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Applicant distribution across SMECC2E regions (from registration).
                New regions appear in the application form region dropdown.
              </p>
              {regionsLoadError && (
                <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
                  {regionsLoadError}
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                  <tr>
                    <th className="px-5 py-3">Region</th>
                    <th className="px-5 py-3">Countries</th>
                    <th className="px-5 py-3">Applicants</th>
                    <th className="px-5 py-3">Pending</th>
                    <th className="px-5 py-3">Under review</th>
                    <th className="px-5 py-3">Approved</th>
                    {!hideEditDelete && (
                      <th className="px-5 py-3 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regionStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={hideEditDelete ? 6 : 7}
                        className="px-5 py-10 text-center font-semibold text-slate-900"
                      >
                        No regions yet. Create one to get started.
                      </td>
                    </tr>
                  ) : (
                    regionStats.map(
                      ({ region, total, pending, underReview, approved }) => (
                        <tr key={region.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            {region.name}
                          </td>
                          <td className="max-w-xs px-5 py-3 text-slate-800">
                            {formatCountries(region.countries)}
                          </td>
                          <td className="px-5 py-3 font-semibold text-[#062763]">
                            {total}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {pending}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {underReview}
                          </td>
                          <td className="px-5 py-3 font-medium text-emerald-800">
                            {approved}
                          </td>
                          {!hideEditDelete && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(region)}
                                  disabled={tableBusy}
                                  className={`${actionIconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                                  aria-label={`Edit ${region.name}`}
                                  title="Edit region"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingRegion(region);
                                    setDeleteError(null);
                                  }}
                                  disabled={tableBusy}
                                  className={`${actionIconBtnClass} border-red-200 text-red-700 hover:bg-red-50`}
                                  aria-label={`Delete ${region.name}`}
                                  title="Delete region"
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-region-title"
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="create-region-title"
              className="text-lg font-bold text-[#062763]"
            >
              Create region
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Add a region and the countries it covers for applicant registration.
            </p>
            <form onSubmit={handleCreateRegion} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="region-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Region name
                </label>
                <input
                  id="region-name"
                  type="text"
                  value={newRegionName}
                  onChange={(e) => {
                    setNewRegionName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="e.g. Horn of Africa"
                  disabled={creating}
                  autoFocus
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="region-countries"
                  className="block text-xs font-bold text-slate-800"
                >
                  Countries
                </label>
                <p className="mt-0.5 text-xs font-medium text-slate-600">
                  Add one or more countries. Separate multiple with commas.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    id="region-countries"
                    type="text"
                    value={countryInput}
                    onChange={(e) => {
                      setCountryInput(e.target.value);
                      setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCountryToList();
                      }
                    }}
                    placeholder="e.g. Ethiopia, Kenya"
                    disabled={creating}
                    className="min-w-0 flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={addCountryToList}
                    disabled={creating || !countryInput.trim()}
                    className="shrink-0 rounded-lg border-2 border-[#062763]/30 px-3 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {newCountries.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {newCountries.map((country) => (
                      <li key={country}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0ff] px-2.5 py-1 text-xs font-semibold text-[#062763]">
                          {country}
                          <button
                            type="button"
                            onClick={() => removeCountry(country)}
                            disabled={creating}
                            className="rounded-full p-0.5 hover:bg-[#062763]/15 disabled:opacity-50"
                            aria-label={`Remove ${country}`}
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
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

      {!hideEditDelete && editingRegion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-region-title"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="edit-region-title"
              className="text-lg font-bold text-[#062763]"
            >
              Edit region
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Update {editingRegion.name} and its countries.
            </p>
            <form onSubmit={handleUpdateRegion} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="edit-region-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Region name
                </label>
                <input
                  id="edit-region-name"
                  type="text"
                  value={editRegionName}
                  onChange={(e) => {
                    setEditRegionName(e.target.value);
                    setUpdateError(null);
                  }}
                  disabled={updating}
                  autoFocus
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-region-countries"
                  className="block text-xs font-bold text-slate-800"
                >
                  Countries
                </label>
                <p className="mt-0.5 text-xs font-medium text-slate-600">
                  Add one or more countries. Separate multiple with commas.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    id="edit-region-countries"
                    type="text"
                    value={editCountryInput}
                    onChange={(e) => {
                      setEditCountryInput(e.target.value);
                      setUpdateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEditCountryToList();
                      }
                    }}
                    placeholder="e.g. Ethiopia, Kenya"
                    disabled={updating}
                    className="min-w-0 flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={addEditCountryToList}
                    disabled={updating || !editCountryInput.trim()}
                    className="shrink-0 rounded-lg border-2 border-[#062763]/30 px-3 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {editCountries.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {editCountries.map((country) => (
                      <li key={country}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0ff] px-2.5 py-1 text-xs font-semibold text-[#062763]">
                          {country}
                          <button
                            type="button"
                            onClick={() => removeEditCountry(country)}
                            disabled={updating}
                            className="rounded-full p-0.5 hover:bg-[#062763]/15 disabled:opacity-50"
                            aria-label={`Remove ${country}`}
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
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

              {updateError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {updateError}
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

      {!hideEditDelete && deletingRegion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-region-title"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-region-title"
              className="text-lg font-bold text-red-800"
            >
              Delete region
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Remove <strong>{deletingRegion.name}</strong>? This cannot be
              undone.
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
                onClick={handleDeleteRegion}
                disabled={deleting}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
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
