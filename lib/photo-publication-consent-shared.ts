export const PHOTO_CONSENT_ITEMS = [
  ["portrait", "Portrait/profile photograph supplied by me"],
  [
    "events",
    "Photographs taken during SMECC2E meetings, training, academic, research, internship or project events",
  ],
  ["fullName", "Full name"],
  ["home", "Home institution / previous institution"],
  ["host", "Host institution / organisation"],
  ["mobility", "Mobility category and mobility type"],
  ["programme", "Programme/field of study or professional area"],
  ["topic", "Research, thesis, traineeship or internship topic/title"],
  ["achievements", "Project-related achievements, awards, outputs or milestones"],
  ["biography", "Approved quotation, testimonial or short biography"],
] as const;

export const PHOTO_CONSENT_CHANNELS = [
  ["website", "SMECC2E website and Integrated Portal"],
  ["social", "Official SMECC2E social-media pages"],
  ["reports", "Project reports, newsletters, brochures, flyers, posters, factsheets and infographics"],
  ["events", "Presentations, workshops, conferences, exhibitions and project events"],
  ["partners", "Partner-university / host-organisation communication channels for SMECC2E activities"],
  [
    "euAu",
    "European Union / African Union / Intra-Africa Academic Mobility Scheme reporting and visibility materials",
  ],
  ["press", "Press releases and other SMECC2E-authorised public communication"],
] as const;

export const PHOTO_CONSENT_PRIVACY = [
  [
    "relevant",
    "Only information relevant to SMECC2E visibility, reporting, dissemination and communication may be used under this consent.",
  ],
  [
    "sensitive",
    "Sensitive information such as passport details, residential address, banking information, medical information, passwords and confidential identifiers is not covered by this consent.",
  ],
  [
    "editing",
    "Photographs may be cropped, resized, captioned or combined with approved project branding, but must not be used in a misleading, defamatory or materially altered manner.",
  ],
  [
    "thirdParties",
    "Material published online may be viewed, downloaded, shared or archived by third parties outside the direct control of SMECC2E.",
  ],
  [
    "withdrawal",
    "I may withdraw consent for future use by written notice to the SMECC2E Project Management Team. Withdrawal applies prospectively and may not remove material already lawfully printed, distributed, archived, reported or republished before receipt of the withdrawal.",
  ],
  [
    "noEffect",
    "Refusal or withdrawal of consent will not affect my scholarship entitlement, academic standing, mobility participation or access to project support.",
  ],
] as const;

export type PhotoConsentId = (typeof PHOTO_CONSENT_ITEMS)[number][0];
export type PhotoConsentChannelId = (typeof PHOTO_CONSENT_CHANNELS)[number][0];
export type PhotoConsentPrivacyId = (typeof PHOTO_CONSENT_PRIVACY)[number][0];
export type PhotoConsentCohort = "cohort-1" | "cohort-2" | "cohort-3";
export type PhotoConsentDecision = "yes" | "no";

export type PhotoConsentChoice = {
  decision: PhotoConsentDecision;
  notes: string;
};

export type PhotoPublicationConsentFormData = {
  cohort: PhotoConsentCohort;
  fieldProgramme: string;
  consent: Record<PhotoConsentId, PhotoConsentChoice>;
  channels: PhotoConsentChannelId[];
  privacy: Record<PhotoConsentPrivacyId, boolean>;
  excludedPhotos: string;
  excludedDetails: string;
  excludedChannels: string;
  otherRestrictions: string;
  declared: boolean;
  signature: string;
  signedAt: string;
};

const COHORTS = new Set(["cohort-1", "cohort-2", "cohort-3"]);
const DECISIONS = new Set(["yes", "no"]);
const CHANNEL_IDS = new Set(PHOTO_CONSENT_CHANNELS.map(([id]) => id));
const PRIVACY_IDS = PHOTO_CONSENT_PRIVACY.map(([id]) => id);
const CONSENT_IDS = PHOTO_CONSENT_ITEMS.map(([id]) => id);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asConsentChoices(
  value: unknown
): Record<PhotoConsentId, PhotoConsentChoice> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const result = {} as Record<PhotoConsentId, PhotoConsentChoice>;
  for (const id of CONSENT_IDS) {
    const entry = record[id];
    if (!entry || typeof entry !== "object") return null;
    const choice = entry as Record<string, unknown>;
    const decision = asString(choice.decision);
    if (!DECISIONS.has(decision)) return null;
    result[id] = {
      decision: decision as PhotoConsentDecision,
      notes: asString(choice.notes),
    };
  }
  return result;
}

function asChannels(value: unknown): PhotoConsentChannelId[] {
  if (!Array.isArray(value)) return [];
  const channels: PhotoConsentChannelId[] = [];
  for (const item of value) {
    const id = asString(item);
    if (
      CHANNEL_IDS.has(id as PhotoConsentChannelId) &&
      !channels.includes(id as PhotoConsentChannelId)
    ) {
      channels.push(id as PhotoConsentChannelId);
    }
  }
  return channels;
}

function asPrivacy(
  value: unknown
): Record<PhotoConsentPrivacyId, boolean> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const result = {} as Record<PhotoConsentPrivacyId, boolean>;
  for (const id of PRIVACY_IDS) {
    if (record[id] !== true) return null;
    result[id] = true;
  }
  return result;
}

export function parsePhotoPublicationConsentFormData(
  value: unknown
): PhotoPublicationConsentFormData | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cohort = asString(record.cohort);
  const consent = asConsentChoices(record.consent);
  const privacy = asPrivacy(record.privacy);
  const channels = asChannels(record.channels);
  const signature = asString(record.signature);
  const signedAt = asString(record.signedAt);

  if (!COHORTS.has(cohort)) return null;
  if (!consent || !privacy) return null;
  if (!signature || !signedAt) return null;
  if (record.declared !== true) return null;

  const anyYes = CONSENT_IDS.some((id) => consent[id].decision === "yes");
  if (anyYes && channels.length === 0) return null;

  return {
    cohort: cohort as PhotoConsentCohort,
    fieldProgramme: asString(record.fieldProgramme),
    consent,
    channels,
    privacy,
    excludedPhotos: asString(record.excludedPhotos),
    excludedDetails: asString(record.excludedDetails),
    excludedChannels: asString(record.excludedChannels),
    otherRestrictions: asString(record.otherRestrictions),
    declared: true,
    signature,
    signedAt,
  };
}

export function validatePhotoPublicationConsentFormData(
  value: unknown
): PhotoPublicationConsentFormData {
  const parsed = parsePhotoPublicationConsentFormData(value);
  if (!parsed) {
    throw new Error("Photo & publication consent form is incomplete");
  }
  return parsed;
}

export function photoPublicationConsentCohortLabel(
  value: PhotoConsentCohort
): string {
  if (value === "cohort-2") return "Cohort 2";
  if (value === "cohort-3") return "Cohort 3";
  return "Cohort 1";
}
