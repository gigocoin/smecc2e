-- AlterTable
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "photo_publication_consent_data" JSONB;
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "photo_publication_consent_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "photo_publication_consent_data" JSONB;
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "photo_publication_consent_submitted_at" TIMESTAMP(3);
