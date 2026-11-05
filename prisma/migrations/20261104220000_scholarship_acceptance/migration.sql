-- AlterTable
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "scholarship_acceptance_data" JSONB;
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "scholarship_acceptance_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "scholarship_acceptance_data" JSONB;
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "scholarship_acceptance_submitted_at" TIMESTAMP(3);
