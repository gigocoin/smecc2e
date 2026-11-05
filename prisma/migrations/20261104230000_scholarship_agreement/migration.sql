-- AlterTable
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "scholarship_agreement_data" JSONB;
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "scholarship_agreement_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "scholarship_agreement_data" JSONB;
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "scholarship_agreement_submitted_at" TIMESTAMP(3);
