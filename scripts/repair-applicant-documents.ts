/**
 * Repair document storage for an applicant (run on production with BLOB_READ_WRITE_TOKEN).
 *
 * Usage: npx tsx scripts/repair-applicant-documents.ts APP-2026-0026
 */
import { PrismaClient } from "@prisma/client";
import { list } from "@vercel/blob";
import {
  applicationDocumentStorageRefs,
  migrateApplicationDocumentStorage,
  primaryApplicationDocumentRef,
  useBlobStorage,
} from "../lib/application-document-storage";

const publicId = process.argv[2];
if (!publicId) {
  console.error("Usage: npx tsx scripts/repair-applicant-documents.ts APP-2026-0026");
  process.exit(1);
}

async function listAllBlobs(prefix: string) {
  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function main() {
  if (!useBlobStorage()) {
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set. Add your Vercel Blob token to the environment."
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const row = await prisma.applicant.findFirst({ where: { publicId } });
    if (!row) {
      console.error("Applicant not found:", publicId);
      process.exit(1);
    }

    const refs = applicationDocumentStorageRefs(row.publicId, row.id);
    const primary = primaryApplicationDocumentRef(row.publicId, row.id);

    console.log("Applicant:", row.publicId, row.id);
    console.log("Storage refs:", refs.join(", "));
    console.log("Primary ref:", primary);

    for (const ref of refs) {
      const blobs = await listAllBlobs(`applications/${ref}/`);
      console.log(`\nBlob prefix applications/${ref}/ → ${blobs.length} file(s)`);
      for (const blob of blobs) {
        console.log(" ", blob.pathname);
      }
    }

    const secondary = refs.find((ref) => ref !== primary);
    if (secondary) {
      const secondaryBlobs = await listAllBlobs(`applications/${secondary}/`);
      if (secondaryBlobs.length > 0) {
        console.log(`\nMigrating ${secondaryBlobs.length} file(s) from ${secondary} → ${primary}…`);
        await migrateApplicationDocumentStorage(secondary, primary);
        console.log("Migration complete.");
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
