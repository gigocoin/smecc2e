-- AlterTable
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "personal_contact_data" JSONB;
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "personal_contact_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "personal_contact_data" JSONB;
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "personal_contact_submitted_at" TIMESTAMP(3);
