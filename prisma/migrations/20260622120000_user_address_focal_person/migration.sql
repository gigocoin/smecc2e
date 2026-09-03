-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_focal_person" BOOLEAN NOT NULL DEFAULT false;

-- One focal person per institution
CREATE UNIQUE INDEX IF NOT EXISTS "users_institution_focal_person_unique"
ON "users" ("institution")
WHERE "is_focal_person" = true;
