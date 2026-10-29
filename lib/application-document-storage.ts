import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  documentDisplayName,
  mimeTypeFromFileName,
  type ApplicationDocumentField,
} from "./application-documents";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
};

let r2Client: S3Client | null = null;

function r2ConfigFromEnv(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET_NAME?.trim() ?? "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint };
}

export function useR2Storage(): boolean {
  if (process.env.APPLICATION_DOCUMENT_STORAGE === "local") {
    return false;
  }
  return r2ConfigFromEnv() !== null;
}

export function isProductionWithoutR2Storage(): boolean {
  return process.env.NODE_ENV === "production" && !useR2Storage();
}

export function r2StorageConfigurationError(): string {
  return "Document uploads are not configured for production. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.";
}

export function applicationDocumentStorageErrorResponse(
  err: unknown
): { error: string; status: number } | null {
  const message = err instanceof Error ? err.message : String(err);
  const name =
    err && typeof err === "object" && "name" in err ? String(err.name) : "";
  if (
    message.includes("R2_ACCOUNT_ID") ||
    message.includes("R2_ACCESS_KEY_ID") ||
    message.includes("R2_SECRET_ACCESS_KEY") ||
    message.includes("R2_BUCKET_NAME") ||
    name === "CredentialsProviderError" ||
    name === "InvalidAccessKeyId" ||
    name === "SignatureDoesNotMatch" ||
    name === "NoSuchBucket"
  ) {
    return { error: r2StorageConfigurationError(), status: 503 };
  }
  return null;
}

function getR2Client(): S3Client {
  const config = r2ConfigFromEnv();
  if (!config) {
    throw new Error(r2StorageConfigurationError());
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return r2Client;
}

function bucketName(): string {
  const config = r2ConfigFromEnv();
  if (!config) {
    throw new Error(r2StorageConfigurationError());
  }
  return config.bucket;
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

function objectKey(applicationRef: string, storedName: string): string {
  return `applications/${applicationRef}/${storedName}`;
}

function objectPrefix(applicationRef: string): string {
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

function isMissingObjectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const metadata =
    "$metadata" in err && err.$metadata && typeof err.$metadata === "object"
      ? err.$metadata
      : null;
  const status =
    metadata && "httpStatusCode" in metadata
      ? Number(metadata.httpStatusCode)
      : 0;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({ Bucket: bucketName(), Key: key })
    );
    return true;
  } catch (err) {
    if (isMissingObjectError(err)) return false;
    throw err;
  }
}

async function listObjects(prefix: string): Promise<{ key: string }[]> {
  const objects: { key: string }[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: bucketName(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of page.Contents ?? []) {
      if (item.Key && !item.Key.endsWith("/")) {
        objects.push({ key: item.Key });
      }
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

export async function listApplicationObjectKeys(
  prefix: string
): Promise<string[]> {
  const objects = await listObjects(prefix);
  return objects.map((object) => object.key);
}

async function getObjectBuffer(
  key: string
): Promise<{ buffer: Buffer; contentType?: string } | null> {
  try {
    const result = await getR2Client().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key })
    );
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return {
      buffer: Buffer.from(bytes),
      contentType: result.ContentType,
    };
  } catch (err) {
    if (isMissingObjectError(err)) return null;
    throw err;
  }
}

async function deleteObjectKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = getR2Client();
  const bucket = bucketName();
  await Promise.all(
    keys.map((Key) =>
      client.send(new DeleteObjectCommand({ Bucket: bucket, Key }))
    )
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

async function resolveObjectKey(
  applicationRef: string,
  storedName: string,
  field: ApplicationDocumentField
): Promise<string | null> {
  const direct = objectKey(applicationRef, storedName);
  if (await objectExists(direct)) {
    return direct;
  }

  const objects = await listObjects(objectPrefix(applicationRef));
  if (field === "profile") {
    const profileObject = objects.find((object) =>
      object.key.split("/").pop()?.startsWith("profile")
    );
    return profileObject?.key ?? null;
  }

  const match = objects.find((object) => {
    const fileName = object.key.split("/").pop() ?? "";
    return matchesStoredDocument(fileName, storedName);
  });
  return match?.key ?? null;
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

async function resolveObjectKeyGlobal(
  storedName: string,
  field: ApplicationDocumentField,
  skipRefs: string[]
): Promise<string | null> {
  const skip = new Set(skipRefs);
  const objects = await listObjects("applications/");

  if (field === "profile") {
    const profileObject = objects.find((object) => {
      const parts = object.key.split("/");
      if (parts.length < 3 || skip.has(parts[1] ?? "")) return false;
      return parts[parts.length - 1]?.startsWith("profile");
    });
    return profileObject?.key ?? null;
  }

  const match = objects.find((object) => {
    const parts = object.key.split("/");
    if (parts.length < 3 || skip.has(parts[1] ?? "")) return false;
    const fileName = parts[parts.length - 1] ?? "";
    return matchesStoredDocument(fileName, storedName);
  });
  return match?.key ?? null;
}

export async function saveApplicationDocument(
  applicationRef: string,
  storedName: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  if (isProductionWithoutR2Storage()) {
    throw new Error(r2StorageConfigurationError());
  }

  if (useR2Storage()) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: objectKey(applicationRef, storedName),
        Body: data,
        ContentType: contentType,
      })
    );
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
  if (useR2Storage()) {
    const key = await resolveObjectKey(applicationRef, storedName, field);
    if (!key) return null;

    const downloaded = await getObjectBuffer(key);
    if (!downloaded) return null;

    return {
      buffer: downloaded.buffer,
      fileName: key.split("/").pop() ?? storedName,
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

  if (useR2Storage()) {
    const key = await resolveObjectKeyGlobal(storedName, field, uniqueRefs);
    if (!key) return null;

    const downloaded = await getObjectBuffer(key);
    if (!downloaded) return null;

    const foundRef = key.split("/")[1];
    if (migrateToRef && foundRef && foundRef !== migrateToRef) {
      try {
        await migrateApplicationDocumentStorage(foundRef, migrateToRef);
      } catch (err) {
        console.error("readApplicationDocumentWithRefs global migrate", err);
      }
    }

    return {
      buffer: downloaded.buffer,
      fileName: key.split("/").pop() ?? storedName,
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

  if (useR2Storage()) {
    const objects = await listObjects(objectPrefix(fromRef));
    for (const object of objects) {
      const fileName = object.key.split("/").pop();
      if (!fileName) continue;

      const downloaded = await getObjectBuffer(object.key);
      if (!downloaded) continue;

      await saveApplicationDocument(
        toRef,
        fileName,
        downloaded.buffer,
        downloaded.contentType ?? mimeTypeFromFileName(fileName)
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
  if (useR2Storage()) {
    await deleteObjectKeys([objectKey(applicationRef, storedName)]);
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
  if (useR2Storage()) {
    const objects = await listObjects(objectPrefix(applicationRef));
    await deleteObjectKeys(objects.map((object) => object.key));
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
