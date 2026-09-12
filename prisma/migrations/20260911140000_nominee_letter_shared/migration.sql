-- AlterTable
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "nominee_letter_shared_data" JSONB;
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "nominee_letter_shared_at" TIMESTAMP(3);
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "nominee_letter_sent_at" TIMESTAMP(3);
