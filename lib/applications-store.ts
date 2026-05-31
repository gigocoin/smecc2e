import type {
  ApplicationPayload,
  ApplicationRecord,
  ApplicationStatus,
} from "./application-types";

const globalStore = globalThis as typeof globalThis & {
  __smecc2eApplications?: ApplicationRecord[];
};

function getStore(): ApplicationRecord[] {
  if (!globalStore.__smecc2eApplications) {
    globalStore.__smecc2eApplications = seedApplications();
  }
  return globalStore.__smecc2eApplications;
}

function seedApplications(): ApplicationRecord[] {
  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  return [
    createRecord({
      id: "APP-2026-0001",
      status: "under_review",
      submittedAt: daysAgo(2),
      email: "adaobi.okafor@example.com",
      personalEmail: "adaobi.okafor@example.com",
      surname: "Okafor",
      firstName: "Adaobi",
      nationality: "Nigeria",
      countryOfResidence: "Nigeria",
      region: "Western Africa",
      typeOfMobility: "MSc Degree-Seeking",
      preferredHostInstitution: "University of Nigeria (UNN)",
      proposedAcademicProgramme: "MSc Sustainable Energy Systems",
      thematicArea: "Sustainable Energy Systems",
      gender: "Female",
      belongsToDisadvantagedGroup: "Yes",
      disadvantagedFinancially: true,
    }),
    createRecord({
      id: "APP-2026-0002",
      status: "under_review",
      submittedAt: daysAgo(5),
      email: "jean.mukama@example.com",
      personalEmail: "jean.mukama@example.com",
      surname: "Mukama",
      firstName: "Jean",
      nationality: "Rwanda",
      countryOfResidence: "Rwanda",
      region: "Eastern Africa",
      typeOfMobility: "PhD Degree-Seeking",
      preferredHostInstitution: "University of Rwanda",
      proposedAcademicProgramme: "PhD Sustainable Energy",
      thematicArea: "Climate Change (Mitigation & Adaptation)",
      gender: "Male",
      belongsToDisadvantagedGroup: "No",
    }),
    createRecord({
      id: "APP-2026-0003",
      status: "approved",
      submittedAt: daysAgo(12),
      email: "fatou.diallo@example.com",
      personalEmail: "fatou.diallo@example.com",
      surname: "Diallo",
      firstName: "Fatou",
      nationality: "Senegal",
      countryOfResidence: "Senegal",
      region: "Western Africa",
      typeOfMobility: "Traineeship Mobility",
      preferredHostInstitution: "University of Cape Coast",
      gender: "Female",
      belongsToDisadvantagedGroup: "Yes",
      disadvantagedMinority: true,
    }),
  ];
}

function createRecord(
  partial: Partial<ApplicationRecord> & Pick<ApplicationRecord, "id" | "status" | "submittedAt">
): ApplicationRecord {
  const base: ApplicationPayload = {
    email: "",
    nationality: "",
    countryOfResidence: "",
    region: "",
    typeOfMobility: "",
    preferredHostInstitution: "",
    proposedAcademicProgramme: "",
    thematicArea: "",
    surname: "",
    firstName: "",
    middleName: "",
    gender: "",
    dateOfBirth: "",
    stateProvince: "",
    homeAddress: "",
    personalEmail: "",
    phoneNumber: "",
    linkedinUrl: "",
    socialMediaUrl: "",
    passportOrIdNumber: "",
    nextOfKinName: "",
    nextOfKinWhatsapp: "",
    nextOfKinEmail: "",
    nextOfKinRelationship: "",
    belongsToDisadvantagedGroup: "",
    disadvantagedFinancially: false,
    disadvantagedDisability: false,
    disadvantagedRefugee: false,
    disadvantagedConflict: false,
    disadvantagedMinority: false,
    disadvantagedOther: false,
    disadvantagedOtherSpecify: "",
    eduBachelor: false,
    eduMaster: false,
    eduPhd: false,
    bachelorProgrammeUniversity: "",
    bachelorCgpa: "",
    masterProgrammeUniversity: "",
    masterCgpa: "",
  };

  const submittedAt = partial.submittedAt;
  return {
    ...base,
    ...partial,
    updatedAt: partial.updatedAt ?? submittedAt,
  };
}

function nextId(records: ApplicationRecord[]): string {
  const year = new Date().getFullYear();
  const max = records.reduce((acc, r) => {
    const match = r.id.match(/^APP-\d{4}-(\d+)$/);
    return match ? Math.max(acc, parseInt(match[1], 10)) : acc;
  }, 0);
  return `APP-${year}-${String(max + 1).padStart(4, "0")}`;
}

function applicantEmail(payload: ApplicationPayload): string {
  return (payload.personalEmail || payload.email).trim().toLowerCase();
}

export function findDraftByEmail(email: string): ApplicationRecord | undefined {
  const norm = email.trim().toLowerCase();
  if (!norm) return undefined;
  return getStore().find(
    (r) => r.status === "draft" && applicantEmail(r) === norm
  );
}

export function listApplications(options?: {
  includeDrafts?: boolean;
}): ApplicationRecord[] {
  const includeDrafts = options?.includeDrafts ?? false;
  const records = includeDrafts
    ? getStore()
    : getStore().filter((r) => r.status !== "draft");
  return [...records].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function getApplication(id: string): ApplicationRecord | undefined {
  return getStore().find((r) => r.id === id);
}

export function upsertDraftApplication(
  payload: ApplicationPayload,
  currentPage: number
): ApplicationRecord {
  const email = applicantEmail(payload);
  if (!email) {
    throw new Error("Email is required to save application progress");
  }

  const store = getStore();
  const now = new Date().toISOString();
  const existing = findDraftByEmail(email);

  if (existing) {
    const updated: ApplicationRecord = {
      ...existing,
      ...payload,
      status: "draft",
      currentPage,
      updatedAt: now,
    };
    const index = store.indexOf(existing);
    store[index] = updated;
    return updated;
  }

  const record: ApplicationRecord = {
    ...payload,
    id: nextId(store),
    status: "draft",
    submittedAt: now,
    updatedAt: now,
    currentPage,
  };
  store.unshift(record);
  return record;
}

export function submitApplication(
  payload: ApplicationPayload,
  existingId?: string
): ApplicationRecord {
  const store = getStore();
  const now = new Date().toISOString();
  const email = applicantEmail(payload);

  const draft =
    (existingId ? getApplication(existingId) : undefined) ??
    (email ? findDraftByEmail(email) : undefined);

  if (draft?.status === "draft") {
    const updated: ApplicationRecord = {
      ...draft,
      ...payload,
      status: "under_review",
      currentPage: undefined,
      updatedAt: now,
    };
    const index = store.indexOf(draft);
    store[index] = updated;
    return updated;
  }

  const record: ApplicationRecord = {
    ...payload,
    id: nextId(store),
    status: "pending",
    submittedAt: now,
    updatedAt: now,
  };
  store.unshift(record);
  return record;
}

/** @deprecated Use submitApplication for final submit */
export function addApplication(
  payload: ApplicationPayload
): ApplicationRecord {
  return submitApplication(payload);
}

export function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): ApplicationRecord | undefined {
  const store = getStore();
  const index = store.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  const updated: ApplicationRecord = {
    ...store[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  store[index] = updated;
  return updated;
}
