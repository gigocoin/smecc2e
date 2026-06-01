import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { del, get, list, put } from "@vercel/blob";
import {
  documentDisplayName,
  mimeTypeFromFileName,
  type ApplicationDocumentField,
} from "./application-documents";

const BLOB_ACCESS = "private" as const;

export function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isProductionWithoutBlobStorage(): boolean {
  return process.env.NODE_ENV === "production" && !useBlobStorage();
}

export function blobStorageConfigurationError(): string {
  return "Document uploads are not configured for production. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.";
}

function localDocumentsDir(applicationRef: string): string {
  return path.join(
    process.cwd(),
    "public",
    "uploads",
    "applications",
    applicationRef
  );
}

function localDocumentPath(applicationRef: string, storedName: string): string {
  return path.join(localDocumentsDir(applicationRef), storedName);
}

function blobPathname(applicationRef: string, storedName: string): string {
  return `applications/${applicationRef}/${storedName}`;
}

function blobPrefix(applicationRef: string): string {
  return `applications/${applicationRef}/`;
}

/** Storage folder keys to try when resolving uploaded files (public id first). */
export function applicationDocumentStorageRefs(
  publicId: string | null | undefined,
  internalId: string
): string[] {
  const refs: string[] = [];
  const pub = publicId?.trim();
  if (pub) refs.push(pub);
  if (internalId && internalId !== pub) refs.push(internalId);
  return refs.length > 0 ? refs : [internalId];
}

export function primaryApplicationDocumentRef(
  publicId: string | null | undefined,
  internalId: string
): string {
  return publicId?.trim() || internalId;
}

async function localFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

function matchesStoredDocument(
  candidateName: string,
  storedName: string
): boolean {
  const lowerStored = storedName.toLowerCase();
  const lowerCandidate = candidateName.toLowerCase();
  const storedDisplay = documentDisplayName(storedName).toLowerCase();
  const candidateDisplay = documentDisplayName(candidateName).toLowerCase();
  return (
    candidateName === storedName ||
    lowerCandidate === lowerStored ||
    candidateName.endsWith(`__${storedName}`) ||
    candidateDisplay === storedDisplay ||
    documentDisplayName(candidateName) === storedName ||
    documentDisplayName(candidateName).toLowerCase() === lowerStored
  );
}

async function listAllBlobsWithPrefix(prefix: string) {
  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function getBlobBuffer(pathname: string): Promise<Buffer | null> {
  const candidates = [pathname];
  const encoded = pathname
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  if (encoded !== pathname) {
    candidates.push(encoded);
  }

  for (const candidate of candidates) {
    const result = await get(candidate, { access: BLOB_ACCESS });
    if (result?.stream) {
      return streamToBuffer(result.stream);
    }
  }

  return null;
}

async function resolveLocalDocumentPath(
  applicationRef: string,
  storedName: string,
  field: ApplicationDocumentField
): Promise<string | null> {
  if (field === "profile") {
    try {
      const files = await readdir(localDocumentsDir(applicationRef));
      const match = files.find((file) => file.startsWith("profile"));
      return match ? localDocumentPath(applicationRef, match) : null;
    } catch {
      return null;
    }
  }

  const direct = localDocumentPath(applicationRef, storedName);
  if (await localFileExists(direct)) {
    return direct;
  }

  try {
    const files = await readdir(localDocumentsDir(applicationRef));
    const match = files.find((file) => matchesStoredDocument(file, storedName));
    return match ? localDocumentPath(applicationRef, match) : null;
  } catch {
    return null;
  }
}

async function resolveBlobPathname(
  applicationRef: string,
  storedName: string,
  field: ApplicationDocumentField
): Promise<string | null> {
  const direct = blobPathname(applicationRef, storedName);
  const directBuffer = await getBlobBuffer(direct);
  if (directBuffer) {
    return direct;
  }

  const blobs = await listAllBlobsWithPrefix(blobPrefix(applicationRef));
  if (field === "profile") {
    const profileBlob = blobs.find((blob) =>
      blob.pathname.split("/").pop()?.startsWith("profile")
    );
    return profileBlob?.pathname ?? null;
  }

  const match = blobs.find((blob) => {
    const fileName = blob.pathname.split("/").pop() ?? "";
    return matchesStoredDocument(fileName, storedName);
  });
  return match?.pathname ?? null;
}

async function resolveLocalDocumentPathGlobal(
  storedName: string,
  field: ApplicationDocumentField,
  skipRefs: string[]
): Promise<string | null> {
  const skip = new Set(skipRefs);
  const baseDir = path.join(process.cwd(), "public", "uploads", "applications");

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || skip.has(entry.name)) continue;
      const found = await resolveLocalDocumentPath(
        entry.name,
        storedName,
        field
      );
      if (found) return found;
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveBlobPathnameGlobal(
  storedName: string,
  field: ApplicationDocumentField,
  skipRefs: string[]
): Promise<string | null> {
  const skip = new Set(skipRefs);
  const blobs = await listAllBlobsWithPrefix("applications/");

  if (field === "profile") {
    const profileBlob = blobs.find((blob) => {
      const parts = blob.pathname.split("/");
      if (parts.length < 3 || skip.has(parts[1] ?? "")) return false;
      return parts[parts.length - 1]?.startsWith("profile");
    });
    return profileBlob?.pathname ?? null;
  }

  const match = blobs.find((blob) => {
    const parts = blob.pathname.split("/");
    if (parts.length < 3 || skip.has(parts[1] ?? "")) return false;
    const fileName = parts[parts.length - 1] ?? "";
    return matchesStoredDocument(fileName, storedName);
  });
  return match?.pathname ?? null;
}

export async function saveApplicationDocument(
  applicationRef: string,
  storedName: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  if (isProductionWithoutBlobStorage()) {
    throw new Error(blobStorageConfigurationError());
  }

  if (useBlobStorage()) {
    await put(blobPathname(applicationRef, storedName), data, {
      access: BLOB_ACCESS,
      addRandomSuffix: false,
      contentType,
      allowOverwrite: true,
    });
    return;
  }

  const uploadDir = localDocumentsDir(applicationRef);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(localDocumentPath(applicationRef, storedName), data);
}

export async function readApplicationDocument(
  applicationRef: string,
  storedName: string,
  field: ApplicationDocumentField
): Promise<{ buffer: Buffer; fileName: string } | null> {
  if (useBlobStorage()) {
    const pathname = await resolveBlobPathname(
      applicationRef,
      storedName,
      field
    );
    if (!pathname) return null;

    const buffer = await getBlobBuffer(pathname);
    if (!buffer) return null;

    return {
      buffer,
      fileName: pathname.split("/").pop() ?? storedName,
    };
  }

  const filePath = await resolveLocalDocumentPath(
    applicationRef,
    storedName,
    field
  );
  if (!filePath) return null;

  return {
    buffer: await readFile(filePath),
    fileName: path.basename(filePath),
  };
}

export async function readApplicationDocumentWithRefs(
  refs: string[],
  storedName: string,
  field: ApplicationDocumentField,
  options?: { migrateToRef?: string }
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const uniqueRefs = [...new Set(refs.filter(Boolean))];
  const migrateToRef = options?.migrateToRef?.trim();

  for (const ref of uniqueRefs) {
    const document = await readApplicationDocument(ref, storedName, field);
    if (document) {
      if (migrateToRef && ref !== migrateToRef) {
        try {
          await migrateApplicationDocumentStorage(ref, migrateToRef);
        } catch (err) {
          console.error("readApplicationDocumentWithRefs migrate", err);
        }
      }
      return document;
    }
  }

  if (useBlobStorage()) {
    const pathname = await resolveBlobPathnameGlobal(
      storedName,
      field,
      uniqueRefs
    );
    if (!pathname) return null;

    const buffer = await getBlobBuffer(pathname);
    if (!buffer) return null;

    const foundRef = pathname.split("/")[1];
    if (migrateToRef && foundRef && foundRef !== migrateToRef) {
      try {
        await migrateApplicationDocumentStorage(foundRef, migrateToRef);
      } catch (err) {
        console.error("readApplicationDocumentWithRefs global migrate", err);
      }
    }

    return {
      buffer,
      fileName: pathname.split("/").pop() ?? storedName,
    };
  }

  const filePath = await resolveLocalDocumentPathGlobal(
    storedName,
    field,
    uniqueRefs
  );
  if (!filePath) return null;

  return {
    buffer: await readFile(filePath),
    fileName: path.basename(filePath),
  };
}

export async function migrateApplicationDocumentStorage(
  fromRef: string,
  toRef: string
): Promise<void> {
  if (!fromRef || !toRef || fromRef === toRef) return;

  if (useBlobStorage()) {
    const blobs = await listAllBlobsWithPrefix(blobPrefix(fromRef));
    for (const blob of blobs) {
      const fileName = blob.pathname.split("/").pop();
      if (!fileName) continue;

      const result = await get(blob.pathname, { access: BLOB_ACCESS });
      if (!result?.stream) continue;

      const buffer = await streamToBuffer(result.stream);
      const contentType =
        result.headers.get("content-type") ??
        mimeTypeFromFileName(fileName);
      await saveApplicationDocument(
        toRef,
        fileName,
        buffer,
        contentType
      );
    }
    await deleteAllApplicationDocuments(fromRef);
    return;
  }

  const fromDir = localDocumentsDir(fromRef);
  try {
    const files = await readdir(fromDir);
    if (files.length === 0) return;

    for (const file of files) {
      const buffer = await readFile(localDocumentPath(fromRef, file));
      await saveApplicationDocument(toRef, file, buffer, "application/octet-stream");
    }
    await deleteAllApplicationDocuments(fromRef);
  } catch {
    /* source directory may not exist */
  }
}

export async function deleteApplicationDocument(
  applicationRef: string,
  storedName: string
): Promise<void> {
  if (useBlobStorage()) {
    await del(blobPathname(applicationRef, storedName));
    return;
  }

  const filePath = localDocumentPath(applicationRef, storedName);
  if (await localFileExists(filePath)) {
    const { unlink } = await import("fs/promises");
    await unlink(filePath);
  }
}

export async function deleteAllApplicationDocumentsForRefs(
  refs: string[]
): Promise<void> {
  const uniqueRefs = [...new Set(refs.filter(Boolean))];
  await Promise.all(uniqueRefs.map((ref) => deleteAllApplicationDocuments(ref)));
}

export async function deleteAllApplicationDocuments(
  applicationRef: string
): Promise<void> {
  if (useBlobStorage()) {
    const blobs = await listAllBlobsWithPrefix(blobPrefix(applicationRef));
    await Promise.all(blobs.map((blob) => del(blob.pathname)));
    return;
  }

  const dir = localDocumentsDir(applicationRef);
  try {
    const files = await readdir(dir);
    const { unlink, rmdir } = await import("fs/promises");
    await Promise.all(files.map((file) => unlink(path.join(dir, file))));
    await rmdir(dir);
  } catch {
    /* upload directory may not exist */
  }
}
