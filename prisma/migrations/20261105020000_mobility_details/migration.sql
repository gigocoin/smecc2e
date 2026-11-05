-- AlterTable
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "mobility_details_data" JSONB;
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "mobility_details_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "mobility_details_data" JSONB;
ALTER TABLE "scholars" ADD COLUMN IF NOT EXISTS "mobility_details_submitted_at" TIMESTAMP(3);
