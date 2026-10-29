/**
 * Repair document storage for an applicant (run where R2 credentials are set).
 *
 * Usage: npx tsx scripts/repair-applicant-documents.ts APP-2026-0026
 */
import { PrismaClient } from "@prisma/client";
import {
  applicationDocumentStorageRefs,
  listApplicationObjectKeys,
  migrateApplicationDocumentStorage,
  primaryApplicationDocumentRef,
  useR2Storage,
} from "../lib/application-document-storage";

const publicId = process.argv[2];
if (!publicId) {
  console.error("Usage: npx tsx scripts/repair-applicant-documents.ts APP-2026-0026");
  process.exit(1);
}

async function main() {
  if (!useR2Storage()) {
    console.error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
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
      const keys = await listApplicationObjectKeys(`applications/${ref}/`);
      console.log(`\nR2 prefix applications/${ref}/ → ${keys.length} file(s)`);
      for (const key of keys) {
        console.log(" ", key);
      }
    }

    const secondary = refs.find((ref) => ref !== primary);
    if (secondary) {
      const secondaryKeys = await listApplicationObjectKeys(
        `applications/${secondary}/`
      );
      if (secondaryKeys.length > 0) {
        console.log(
          `\nMigrating ${secondaryKeys.length} file(s) from ${secondary} → ${primary}…`
        );
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
