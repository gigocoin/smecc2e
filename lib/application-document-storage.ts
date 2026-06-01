import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { del, get, list, put } from "@vercel/blob";
import {
  documentDisplayName,
  type ApplicationDocumentField,
} from "./application-documents";

const BLOB_ACCESS = "private" as const;

export function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isProductionWithoutBlobStorage(): boolean {
  return process.env.VERCEL === "1" && !useBlobStorage();
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
  return (
    candidateName === storedName ||
    lowerCandidate === lowerStored ||
    candidateName.endsWith(`__${storedName}`) ||
    documentDisplayName(candidateName) === storedName ||
    documentDisplayName(candidateName).toLowerCase() === lowerStored
  );
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
  const directBlob = await get(direct, { access: BLOB_ACCESS });
  if (directBlob) {
    return direct;
  }

  const { blobs } = await list({ prefix: blobPrefix(applicationRef) });
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

    const result = await get(pathname, { access: BLOB_ACCESS });
    if (!result?.stream) return null;

    return {
      buffer: await streamToBuffer(result.stream),
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

export async function deleteAllApplicationDocuments(
  applicationRef: string
): Promise<void> {
  if (useBlobStorage()) {
    const { blobs } = await list({ prefix: blobPrefix(applicationRef) });
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
