import path from "path";
import {
  documentDisplayName,
  mimeTypeFromFileName,
  type ApplicationDocumentField,
} from "./application-documents";
import { readApplicationDocument } from "./application-document-storage";

export function applicationDocumentsDir(applicationRef: string): string {
  return path.join(
    process.cwd(),
    "public",
    "uploads",
    "applications",
    applicationRef
  );
}

export function storedDocumentPath(
  applicationRef: string,
  storedName: string
): string {
  return path.join(applicationDocumentsDir(applicationRef), storedName);
}

export async function resolveDocumentPath(
  applicationRef: string,
  storedName: string,
  field: ApplicationDocumentField
): Promise<string | null> {
  const document = await readApplicationDocument(
    applicationRef,
    storedName,
    field
  );
  return document ? document.fileName : null;
}

export function mimeTypeForFileName(fileName: string): string {
  return mimeTypeFromFileName(fileName);
}

export { documentDisplayName };
