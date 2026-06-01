import type { ApplicationPayload } from "./application-types";

export const APPLICATION_DOCUMENT_FIELDS = {
  profile: "profile",
  passport: "passportFileName",
  disadvantagedDoc: "disadvantagedDocFileName",
  academicCertificates: "academicCertificatesFileName",
  academicTranscripts: "academicTranscriptsFileName",
  proofOfRegistration: "proofOfRegistrationFileName",
  proofOfCoursework: "proofOfCourseworkFileName",
  cv: "cvFileName",
  publications: "publicationsFileName",
  studyResearchPlan: "studyResearchPlanFileName",
  researchProposal: "researchProposalFileName",
  languageCertificate: "languageCertificateFileName",
  referenceLetters: "referenceLettersFileName",
  graduateAdmissionProof: "graduateAdmissionProofFileName",
  staffEmploymentProof: "staffEmploymentProofFileName",
  staffHostCommitmentLetter: "staffHostCommitmentLetterFileName",
  medicalFitnessDeclaration: "medicalFitnessDeclarationFileName",
  previousScholarshipDeclaration: "previousScholarshipDeclarationFileName",
} as const;

export type ApplicationDocumentField = keyof typeof APPLICATION_DOCUMENT_FIELDS;

const PAYLOAD_FILE_KEYS = new Set(
  Object.values(APPLICATION_DOCUMENT_FIELDS).filter((value) => value !== "profile")
);

export function isApplicationDocumentField(
  field: string
): field is ApplicationDocumentField {
  return field in APPLICATION_DOCUMENT_FIELDS;
}

export function documentDisplayName(storedName: string): string {
  const idx = storedName.indexOf("__");
  return idx >= 0 ? storedName.slice(idx + 2) : storedName;
}

export function buildStoredDocumentName(originalName: string): string {
  const safe = originalName.replace(/[^\w.\-() +]/g, "_");
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}__${safe}`;
}

export function getStoredDocumentName(
  application: ApplicationPayload,
  field: ApplicationDocumentField
): string | null {
  if (field === "profile") {
    return application.profileUploaded ? "profile" : null;
  }

  const payloadKey = APPLICATION_DOCUMENT_FIELDS[field];
  const value = application[payloadKey as keyof ApplicationPayload];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function applicationDocumentUrl(
  applicationId: string,
  field: ApplicationDocumentField
): string {
  return `/api/applications/${encodeURIComponent(applicationId)}/documents?field=${encodeURIComponent(field)}`;
}

export function payloadKeyForDocumentField(
  field: ApplicationDocumentField
): keyof ApplicationPayload | null {
  if (field === "profile") return null;
  const key = APPLICATION_DOCUMENT_FIELDS[field];
  return PAYLOAD_FILE_KEYS.has(key) ? (key as keyof ApplicationPayload) : null;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jpe": "image/jpeg",
  ".jfif": "image/jpeg",
  ".pjpeg": "image/jpeg",
  ".pjp": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".apng": "image/apng",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function fileExtension(fileName: string): string {
  const display = documentDisplayName(fileName);
  const base = display.split(/[\\/]/).pop() ?? display;
  const idx = base.lastIndexOf(".");
  return idx >= 0 ? base.slice(idx).toLowerCase() : "";
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.split(";")[0]?.trim().toLowerCase().startsWith("image/");
}

export function mimeTypeFromFileName(fileName: string): string {
  return MIME_BY_EXTENSION[fileExtension(fileName)] ?? "application/octet-stream";
}

export type DocumentPreviewKind = "image" | "pdf" | "unsupported";

export function documentPreviewKind(
  fileName: string,
  contentType?: string | null
): DocumentPreviewKind {
  const mime = (
    contentType?.split(";")[0]?.trim() || mimeTypeFromFileName(fileName)
  ).toLowerCase();

  if (isImageMimeType(mime)) return "image";
  if (mime === "application/pdf" || fileExtension(fileName) === ".pdf") {
    return "pdf";
  }
  return "unsupported";
}

export const JPG_PNG_ACCEPT =
  "image/jpeg,image/png,.jpg,.jpeg,.png";

export const JPG_PNG_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export function isJpgOrPngFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExt = ext === ".jpg" || ext === ".jpeg" || ext === ".png";
  const allowedMime = JPG_PNG_MIME_TYPES.has(file.type);
  return allowedMime || allowedExt;
}

export function isJpgOrPngMimeType(mimeType: string): boolean {
  return JPG_PNG_MIME_TYPES.has(mimeType.split(";")[0]?.trim().toLowerCase());
}

export const PDF_ACCEPT = "application/pdf,.pdf";

export function isPdfFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mime = file.type.split(";")[0]?.trim().toLowerCase();
  return mime === "application/pdf" || ext === ".pdf";
}

export function isPdfMimeType(mimeType: string): boolean {
  return mimeType.split(";")[0]?.trim().toLowerCase() === "application/pdf";
}
