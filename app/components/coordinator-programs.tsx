"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AFRICAN_COUNTRY_OPTIONS } from "@/lib/african-countries";
import type { ProgramRecord, ProgramTypeLabel } from "@/lib/academic-program";
import { PROGRAM_TYPES } from "@/lib/academic-program";
import { THEMATIC_AREA_OPTIONS } from "@/lib/thematic-areas";
import { parseCsv } from "@/lib/csv-parse";
import type { UniversityWithPrograms } from "@/lib/programs-service";

const CSV_PREVIEW_ROW_LIMIT = 5;

const inputClass =
  "mt-1 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

const tableFilterClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 outline-none focus:border-[#062763] focus:ring-1 focus:ring-[#062763]/15";

const actionIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-50";

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

function ProgramStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isActive
          ? "bg-emerald-100 text-emerald-900"
          : "bg-slate-200 text-slate-800"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function CoordinatorPrograms({
  hideEditDelete = false,
}: {
  hideEditDelete?: boolean;
} = {}) {
  const [universities, setUniversities] = useState<UniversityWithPrograms[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [country, setCountry] = useState("");
  const [programType, setProgramType] = useState<ProgramTypeLabel>("Master");
  const [programName, setProgramName] = useState("");
  const [thematicArea, setThematicArea] = useState("");
  const [accreditationDetails, setAccreditationDetails] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadCreated, setUploadCreated] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<
    Array<{ row: number; message: string }>
  >([]);
  const [csvPreview, setCsvPreview] = useState<{
    fileName: string;
    headers: string[];
    rows: string[][];
    totalRows: number;
  } | null>(null);
  const [csvPreviewLoading, setCsvPreviewLoading] = useState(false);
  const [csvPreviewError, setCsvPreviewError] = useState<string | null>(null);

  const [filterInstitution, setFilterInstitution] = useState("all");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterType, setFilterType] = useState<ProgramTypeLabel | "all">("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterThematicArea, setFilterThematicArea] = useState("all");
  const [updatingProgramId, setUpdatingProgramId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [editingProgram, setEditingProgram] = useState<ProgramRecord | null>(null);
  const [editInstitutionId, setEditInstitutionId] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editProgramType, setEditProgramType] = useState<ProgramTypeLabel>("Master");
  const [editProgramName, setEditProgramName] = useState("");
  const [editThematicArea, setEditThematicArea] = useState("");
  const [editAccreditationDetails, setEditAccreditationDetails] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const tableBusy = creating || editing || updatingProgramId !== null;

  const loadPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/programs", { cache: "no-store" });
      const data = (await res.json()) as {
        universities?: UniversityWithPrograms[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Failed to load programs.");
        return;
      }
      setLoadError(null);
      setUniversities(data.universities ?? []);
    } catch {
      setLoadError("Failed to load programs.");
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadPrograms();
    setLoading(false);
  }, [loadPrograms]);

  useEffect(() => {
    // Delay state updates to avoid cascading renders warning.
    const handle = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(handle);
  }, [refresh]);

  const allPrograms = useMemo(
    () => universities.flatMap((u) => u.programs),
    [universities]
  );

  const sortedPrograms = useMemo(
    () =>
      [...allPrograms].sort(
        (a, b) =>
          a.universityName.localeCompare(b.universityName) ||
          a.name.localeCompare(b.name)
      ),
    [allPrograms]
  );

  const filterOptions = useMemo(() => {
    const institutions = new Set<string>();
    const countries = new Set<string>();
    const thematicAreas = new Set<string>();
    for (const program of allPrograms) {
      institutions.add(program.universityName);
      countries.add(program.country);
      thematicAreas.add(program.thematicArea);
    }
    return {
      institutions: [...institutions].sort((a, b) => a.localeCompare(b)),
      countries: [...countries].sort((a, b) => a.localeCompare(b)),
      thematicAreas: [...thematicAreas].sort((a, b) => a.localeCompare(b)),
    };
  }, [allPrograms]);

  const hasActiveFilters =
    filterInstitution !== "all" ||
    filterProgram.trim() !== "" ||
    filterType !== "all" ||
    filterCountry !== "all" ||
    filterThematicArea !== "all";

  const filteredPrograms = useMemo(() => {
    const q = filterProgram.trim().toLowerCase();
    return sortedPrograms.filter((program) => {
      if (
        filterInstitution !== "all" &&
        program.universityName !== filterInstitution
      ) {
        return false;
      }
      if (filterType !== "all" && program.type !== filterType) return false;
      if (filterCountry !== "all" && program.country !== filterCountry) {
        return false;
      }
      if (
        filterThematicArea !== "all" &&
        program.thematicArea !== filterThematicArea
      ) {
        return false;
      }
      if (q) {
        const haystack = `${program.name} ${program.accreditationDetails}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    sortedPrograms,
    filterInstitution,
    filterProgram,
    filterType,
    filterCountry,
    filterThematicArea,
  ]);

  const clearFilters = () => {
    setFilterInstitution("all");
    setFilterProgram("");
    setFilterType("all");
    setFilterCountry("all");
    setFilterThematicArea("all");
  };

  const resetCreateForm = () => {
    setSelectedInstitutionId("");
    setCountry("");
    setProgramType("Master");
    setProgramName("");
    setThematicArea("");
    setAccreditationDetails("");
    setCreateError(null);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadError(null);
    setUploadCreated(0);
    setUploadErrors([]);
    setCsvPreview(null);
    setCsvPreviewLoading(false);
    setCsvPreviewError(null);
  };

  const loadCsvPreview = useCallback(async (file: File) => {
    setCsvPreviewLoading(true);
    setCsvPreviewError(null);
    setCsvPreview(null);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      const dataRows = rows.filter((row) =>
        row.some((cell) => cell.trim() !== "")
      );
      if (!headers.length) {
        setCsvPreviewError("CSV has no header row.");
        return;
      }
      setCsvPreview({
        fileName: file.name,
        headers,
        rows: dataRows.slice(0, CSV_PREVIEW_ROW_LIMIT),
        totalRows: dataRows.length,
      });
    } catch {
      setCsvPreviewError("Could not read CSV file for preview.");
    } finally {
      setCsvPreviewLoading(false);
    }
  }, []);

  const closeUploadModal = () => {
    if (uploading) return;
    setUploadOpen(false);
    resetUploadForm();
  };

  const handleInstitutionChange = (dbId: string) => {
    setSelectedInstitutionId(dbId);
    setCreateError(null);
    const institution = universities.find((u) => u.dbId === dbId);
    if (institution && !country) {
      const firstProgram = institution.programs[0];
      if (firstProgram?.country) {
        setCountry(firstProgram.country);
      }
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitutionId) {
      setCreateError("Select an institution.");
      return;
    }
    if (!country.trim()) {
      setCreateError("Select a country.");
      return;
    }
    if (!programName.trim()) {
      setCreateError("Enter the name of the program.");
      return;
    }
    if (!thematicArea) {
      setCreateError("Select a thematic area.");
      return;
    }
    if (!accreditationDetails.trim()) {
      setCreateError("Enter details of accreditation.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          institutionId: selectedInstitutionId,
          country: country.trim(),
          type: programType,
          name: programName.trim(),
          thematicArea,
          accreditationDetails: accreditationDetails.trim(),
        }),
      });
      const data = (await res.json()) as {
        universities?: UniversityWithPrograms[];
        error?: string;
      };
      if (!res.ok) {
        setCreateError(data.error ?? "Could not create program.");
        return;
      }
      if (data.universities) setUniversities(data.universities);
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      setCreateError("Could not create program.");
    } finally {
      setCreating(false);
    }
  };

  const handleUploadCsv = async () => {
    if (!uploadFile) {
      setUploadError("Select a CSV file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadCreated(0);
    setUploadErrors([]);

    try {
      const uploadData = new FormData();
      uploadData.append("file", uploadFile);

      const res = await fetch("/api/programs/upload-csv", {
        method: "POST",
        body: uploadData,
        cache: "no-store",
      });

      const data = (await res.json()) as {
        created?: number;
        errors?: Array<{ row: number; message: string }>;
        universities?: UniversityWithPrograms[];
        error?: string;
      };

      if (!res.ok) {
        setUploadError(data.error ?? "Could not import programs from CSV.");
        if (data.errors) setUploadErrors(data.errors);
        return;
      }

      if (data.universities) setUniversities(data.universities);
      setUploadCreated(data.created ?? 0);
      setUploadErrors(data.errors ?? []);
    } catch {
      setUploadError("Could not import programs from CSV.");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleProgramActive = async (
    programId: string,
    isActive: boolean
  ) => {
    setUpdatingProgramId(programId);
    setStatusError(null);
    try {
      const res = await fetch(`/api/programs/${encodeURIComponent(programId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ isActive }),
      });
      const data = (await res.json()) as {
        universities?: UniversityWithPrograms[];
        error?: string;
      };
      if (!res.ok) {
        setStatusError(data.error ?? "Could not update program status.");
        return;
      }
      if (data.universities) setUniversities(data.universities);
    } catch {
      setStatusError("Could not update program status.");
    } finally {
      setUpdatingProgramId(null);
    }
  };

  const resetEditForm = () => {
    setEditInstitutionId("");
    setEditCountry("");
    setEditProgramType("Master");
    setEditProgramName("");
    setEditThematicArea("");
    setEditAccreditationDetails("");
    setEditError(null);
  };

  const openEdit = (program: ProgramRecord) => {
    if (tableBusy) return;
    setEditingProgram(program);
    setEditInstitutionId(program.universityId);
    setEditCountry(program.country);
    setEditProgramType(program.type);
    setEditProgramName(program.name);
    setEditThematicArea(program.thematicArea);
    setEditAccreditationDetails(program.accreditationDetails);
    setEditError(null);
  };

  const closeEditModal = () => {
    if (editing) return;
    setEditingProgram(null);
    resetEditForm();
  };

  const handleEditInstitutionChange = (dbId: string) => {
    setEditInstitutionId(dbId);
    setEditError(null);
  };

  const handleEditProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    if (!editInstitutionId) {
      setEditError("Select an institution.");
      return;
    }
    if (!editCountry.trim()) {
      setEditError("Select a country.");
      return;
    }
    if (!editProgramName.trim()) {
      setEditError("Enter the name of the program.");
      return;
    }
    if (!editThematicArea) {
      setEditError("Select a thematic area.");
      return;
    }
    if (!editAccreditationDetails.trim()) {
      setEditError("Enter details of accreditation.");
      return;
    }

    setEditing(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/programs/${encodeURIComponent(editingProgram.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            institutionId: editInstitutionId,
            country: editCountry.trim(),
            type: editProgramType,
            name: editProgramName.trim(),
            thematicArea: editThematicArea,
            accreditationDetails: editAccreditationDetails.trim(),
          }),
        }
      );
      const data = (await res.json()) as {
        universities?: UniversityWithPrograms[];
        error?: string;
      };
      if (!res.ok) {
        setEditError(data.error ?? "Could not update program.");
        return;
      }
      if (data.universities) setUniversities(data.universities);
      setEditingProgram(null);
      resetEditForm();
    } catch {
      setEditError("Could not update program.");
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-lg font-bold text-[#062763] sm:text-xl">Programs</h1>
          <p className="text-sm font-semibold text-slate-800">
            Academic programmes by SMECC2E partner institution
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={loading || universities.length === 0}
            className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
          >
            Create program
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            disabled={loading || universities.length === 0}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border-2 border-[#062763]/25 px-4 py-2 text-sm font-semibold text-[#062763] transition hover:bg-[#062763]/5 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        {loadError && (
          <p className="mb-4 text-sm font-semibold text-red-700" role="alert">
            {loadError}
          </p>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="region-stat-card rounded-xl border border-slate-200 border-t-4 border-t-[#062763] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Partner institutions
            </p>
            <p className="mt-2 text-3xl font-bold text-[#062763] tabular-nums">
              {universities.length}
            </p>
          </div>
          <div className="region-stat-card rounded-xl border border-slate-200 border-t-4 border-t-sky-400 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Listed programmes
            </p>
            <p className="mt-2 text-3xl font-bold text-[#062763] tabular-nums">
              {allPrograms.length}
            </p>
          </div>
        </div>

        {universities.length === 0 && !loading ? (
          <p className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-semibold text-slate-900">
            No institutions yet. Add institutions first, then create programs.
          </p>
        ) : null}

        {universities.length > 0 && !loading && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-[#062763]">
                All programmes
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {sortedPrograms.length === 0
                  ? "No programs listed yet."
                  : hasActiveFilters
                    ? `Showing ${filteredPrograms.length} of ${sortedPrograms.length} programme${sortedPrograms.length === 1 ? "" : "s"}.`
                    : `${sortedPrograms.length} programme${sortedPrograms.length === 1 ? "" : "s"} across partner institutions.`}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Only active programmes appear in the applicant application form.
              </p>
              {statusError && (
                <p className="mt-2 text-sm font-medium text-red-700">{statusError}</p>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-xs font-semibold text-[#062763] underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="bg-[#e8f0ff] text-xs font-bold uppercase tracking-wide text-[#062763]">
                    <th className="px-5 py-3">Institution</th>
                    <th className="px-5 py-3">Program</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Country</th>
                    <th className="px-5 py-3">Thematic area</th>
                    <th className="px-5 py-3">Accreditation</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-white text-xs font-semibold normal-case tracking-normal text-slate-800">
                    <th className="px-3 py-2" scope="col">
                      <label className="sr-only" htmlFor="filter-institution">
                        Filter by institution
                      </label>
                      <select
                        id="filter-institution"
                        value={filterInstitution}
                        onChange={(e) => setFilterInstitution(e.target.value)}
                        className={tableFilterClass}
                      >
                        <option value="all">All</option>
                        {filterOptions.institutions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-3 py-2" scope="col">
                      <label className="sr-only" htmlFor="filter-program">
                        Search program or accreditation
                      </label>
                      <input
                        id="filter-program"
                        type="search"
                        value={filterProgram}
                        onChange={(e) => setFilterProgram(e.target.value)}
                        placeholder="Search…"
                        className={tableFilterClass}
                      />
                    </th>
                    <th className="px-3 py-2" scope="col">
                      <label className="sr-only" htmlFor="filter-type">
                        Filter by type
                      </label>
                      <select
                        id="filter-type"
                        value={filterType}
                        onChange={(e) =>
                          setFilterType(e.target.value as ProgramTypeLabel | "all")
                        }
                        className={tableFilterClass}
                      >
                        <option value="all">All</option>
                        {PROGRAM_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-3 py-2" scope="col">
                      <label className="sr-only" htmlFor="filter-country">
                        Filter by country
                      </label>
                      <select
                        id="filter-country"
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                        className={tableFilterClass}
                      >
                        <option value="all">All</option>
                        {filterOptions.countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-3 py-2" scope="col">
                      <label className="sr-only" htmlFor="filter-thematic-area">
                        Filter by thematic area
                      </label>
                      <select
                        id="filter-thematic-area"
                        value={filterThematicArea}
                        onChange={(e) => setFilterThematicArea(e.target.value)}
                        className={tableFilterClass}
                      >
                        <option value="all">All</option>
                        {filterOptions.thematicAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-3 py-2" scope="col" aria-hidden>
                      <span className="sr-only">Accreditation filter uses program search</span>
                    </th>
                    <th className="px-3 py-2" scope="col" aria-hidden />
                    <th className="px-3 py-2" scope="col" aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPrograms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-700"
                      >
                        No programs yet. Create one or upload a CSV to get
                        started.
                      </td>
                    </tr>
                  ) : filteredPrograms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-700"
                      >
                        No programmes match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map((program) => (
                      <tr
                        key={program.id}
                        className={`hover:bg-slate-50 ${program.isActive ? "" : "bg-slate-50/80 opacity-75"}`}
                      >
                        <td className="px-5 py-3 font-semibold text-[#062763]">
                          {program.universityName}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {program.name}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {program.type}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {program.country}
                        </td>
                        <td className="max-w-xs px-5 py-3 font-medium text-slate-900">
                          {program.thematicArea}
                        </td>
                        <td
                          className="max-w-sm px-5 py-3 font-medium text-slate-900"
                          title={program.accreditationDetails}
                        >
                          <span className="line-clamp-2">
                            {program.accreditationDetails}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <ProgramStatusBadge isActive={program.isActive} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {!hideEditDelete && (
                              <button
                                type="button"
                                onClick={() => openEdit(program)}
                                disabled={tableBusy}
                                className={`${actionIconBtnClass} border-[#062763]/25 text-[#062763] hover:bg-[#062763]/5`}
                                aria-label={`Edit ${program.name}`}
                                title="Edit program"
                              >
                                <EditIcon />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                void handleToggleProgramActive(
                                  program.id,
                                  !program.isActive
                                )
                              }
                              disabled={updatingProgramId === program.id || editing}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                program.isActive
                                  ? "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                              }`}
                            >
                              {updatingProgramId === program.id
                                ? "Saving…"
                                : program.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-program-title"
          onClick={closeCreateModal}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="create-program-title"
              className="text-lg font-bold text-[#062763]"
            >
              Create program
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Add an academic programme under a partner institution.
            </p>
            <form onSubmit={handleCreateProgram} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="program-institution"
                  className="block text-xs font-bold text-slate-800"
                >
                  Institution
                </label>
                <select
                  id="program-institution"
                  value={selectedInstitutionId}
                  onChange={(e) => handleInstitutionChange(e.target.value)}
                  disabled={creating}
                  required
                  className={inputClass}
                >
                  <option value="">Select institution</option>
                  {universities.map((university) => (
                    <option key={university.dbId} value={university.dbId}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="program-country"
                  className="block text-xs font-bold text-slate-800"
                >
                  Country
                </label>
                <select
                  id="program-country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCreateError(null);
                  }}
                  disabled={creating}
                  required
                  className={inputClass}
                >
                  <option value="">Select country</option>
                  {AFRICAN_COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="program-type"
                  className="block text-xs font-bold text-slate-800"
                >
                  Type of program
                </label>
                <select
                  id="program-type"
                  value={programType}
                  onChange={(e) => {
                    setProgramType(e.target.value as ProgramTypeLabel);
                    setCreateError(null);
                  }}
                  disabled={creating}
                  required
                  className={inputClass}
                >
                  {PROGRAM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="program-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Name of program
                </label>
                <input
                  id="program-name"
                  type="text"
                  value={programName}
                  onChange={(e) => {
                    setProgramName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="e.g. MSc Renewable Energy Systems"
                  disabled={creating}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="program-thematic-area"
                  className="block text-xs font-bold text-slate-800"
                >
                  Thematic area
                </label>
                <select
                  id="program-thematic-area"
                  value={thematicArea}
                  onChange={(e) => {
                    setThematicArea(e.target.value);
                    setCreateError(null);
                  }}
                  disabled={creating}
                  required
                  className={inputClass}
                >
                  <option value="">Select thematic area</option>
                  {THEMATIC_AREA_OPTIONS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="program-accreditation"
                  className="block text-xs font-bold text-slate-800"
                >
                  Details of accreditation
                </label>
                <textarea
                  id="program-accreditation"
                  value={accreditationDetails}
                  onChange={(e) => {
                    setAccreditationDetails(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="Accreditation body, status, validity, etc."
                  disabled={creating}
                  rows={3}
                  className={inputClass}
                />
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

      {!hideEditDelete && editingProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-program-title"
          onClick={closeEditModal}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="edit-program-title"
              className="text-lg font-bold text-[#062763]"
            >
              Edit program
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Update programme details for {editingProgram.universityName}.
            </p>
            <form onSubmit={handleEditProgram} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="edit-program-institution"
                  className="block text-xs font-bold text-slate-800"
                >
                  Institution
                </label>
                <select
                  id="edit-program-institution"
                  value={editInstitutionId}
                  onChange={(e) => handleEditInstitutionChange(e.target.value)}
                  disabled={editing}
                  required
                  className={inputClass}
                >
                  <option value="">Select institution</option>
                  {universities.map((university) => (
                    <option key={university.dbId} value={university.dbId}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-program-country"
                  className="block text-xs font-bold text-slate-800"
                >
                  Country
                </label>
                <select
                  id="edit-program-country"
                  value={editCountry}
                  onChange={(e) => {
                    setEditCountry(e.target.value);
                    setEditError(null);
                  }}
                  disabled={editing}
                  required
                  className={inputClass}
                >
                  <option value="">Select country</option>
                  {AFRICAN_COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-program-type"
                  className="block text-xs font-bold text-slate-800"
                >
                  Type of program
                </label>
                <select
                  id="edit-program-type"
                  value={editProgramType}
                  onChange={(e) => {
                    setEditProgramType(e.target.value as ProgramTypeLabel);
                    setEditError(null);
                  }}
                  disabled={editing}
                  required
                  className={inputClass}
                >
                  {PROGRAM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-program-name"
                  className="block text-xs font-bold text-slate-800"
                >
                  Name of program
                </label>
                <input
                  id="edit-program-name"
                  type="text"
                  value={editProgramName}
                  onChange={(e) => {
                    setEditProgramName(e.target.value);
                    setEditError(null);
                  }}
                  placeholder="e.g. MSc Renewable Energy Systems"
                  disabled={editing}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-program-thematic-area"
                  className="block text-xs font-bold text-slate-800"
                >
                  Thematic area
                </label>
                <select
                  id="edit-program-thematic-area"
                  value={editThematicArea}
                  onChange={(e) => {
                    setEditThematicArea(e.target.value);
                    setEditError(null);
                  }}
                  disabled={editing}
                  required
                  className={inputClass}
                >
                  <option value="">Select thematic area</option>
                  {THEMATIC_AREA_OPTIONS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-program-accreditation"
                  className="block text-xs font-bold text-slate-800"
                >
                  Details of accreditation
                </label>
                <textarea
                  id="edit-program-accreditation"
                  value={editAccreditationDetails}
                  onChange={(e) => {
                    setEditAccreditationDetails(e.target.value);
                    setEditError(null);
                  }}
                  placeholder="Accreditation body, status, validity, etc."
                  disabled={editing}
                  rows={3}
                  className={inputClass}
                />
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
                  disabled={editing}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
                >
                  {editing ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-programs-title"
          onClick={closeUploadModal}
        >
          <div
            className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="upload-programs-title"
              className="text-lg font-bold text-[#062763]"
            >
              Upload programs (CSV)
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              CSV headers supported: Institution, Country, Type of program, Name
              of Program, Thematic Area, Details of Accreditation.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="upload-csv"
                  className="block text-xs font-bold text-slate-800"
                >
                  Select CSV file
                </label>
                <input
                  id="upload-csv"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setUploadFile(f);
                    setUploadError(null);
                    setUploadCreated(0);
                    setUploadErrors([]);
                    setCsvPreview(null);
                    setCsvPreviewError(null);
                    if (f) void loadCsvPreview(f);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-2 file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#062763] hover:file:bg-slate-50 disabled:opacity-50"
                />
                {uploadFile && (
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>

              {csvPreviewLoading && (
                <p className="text-sm font-semibold text-slate-700">
                  Loading preview…
                </p>
              )}

              {csvPreviewError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {csvPreviewError}
                </p>
              )}

              {csvPreview && !csvPreviewLoading && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      Preview
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {csvPreview.totalRows === 0
                        ? "No data rows"
                        : csvPreview.totalRows <= CSV_PREVIEW_ROW_LIMIT
                          ? `${csvPreview.totalRows} row${csvPreview.totalRows === 1 ? "" : "s"}`
                          : `Showing first ${CSV_PREVIEW_ROW_LIMIT} of ${csvPreview.totalRows} rows`}
                    </p>
                  </div>
                  <div className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-[#062763] text-white">
                        <tr>
                          {csvPreview.headers.map((header, i) => (
                            <th
                              key={`${header}-${i}`}
                              className="max-w-40 truncate px-2 py-2 font-bold"
                              title={header}
                            >
                              {header || `Column ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={Math.max(csvPreview.headers.length, 1)}
                              className="px-2 py-3 text-center font-semibold text-slate-600"
                            >
                              No data rows in file
                            </td>
                          </tr>
                        ) : (
                          csvPreview.rows.map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="border-t border-slate-100 odd:bg-white even:bg-slate-50/80"
                            >
                              {csvPreview.headers.map((_, colIndex) => {
                                const value = row[colIndex] ?? "";
                                return (
                                  <td
                                    key={colIndex}
                                    className="max-w-40 truncate px-2 py-2 font-medium text-slate-900"
                                    title={value}
                                  >
                                    {value || "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {uploadError}
                </p>
              )}

              {uploadCreated > 0 && (
                <p className="text-sm font-semibold text-emerald-800">
                  Imported {uploadCreated} programme(s).
                </p>
              )}

              {uploadErrors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-950">
                    Row-level errors
                  </p>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm font-semibold text-amber-950">
                    {uploadErrors.slice(0, 10).map((err) => (
                      <li key={`${err.row}-${err.message}`}>
                        Line {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                  {uploadErrors.length > 10 && (
                    <p className="mt-2 text-xs font-semibold text-amber-950">
                      Showing first 10 of {uploadErrors.length} errors.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
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
                onClick={handleUploadCsv}
                disabled={uploading || !uploadFile}
                className="rounded-lg bg-[#062763] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062763]/90 disabled:opacity-50"
              >
                {uploading ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
