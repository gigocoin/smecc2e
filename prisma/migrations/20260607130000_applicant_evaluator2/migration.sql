-- Support two evaluator slots per application
ALTER TABLE "applicants" RENAME COLUMN "evaluator_id" TO "evaluator1_id";

ALTER TABLE "applicants" DROP CONSTRAINT IF EXISTS "applicants_evaluator_id_fkey";
ALTER TABLE "applicants"
  ADD CONSTRAINT "applicants_evaluator1_id_fkey"
  FOREIGN KEY ("evaluator1_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "applicants_evaluator_id_idx";
CREATE INDEX "applicants_evaluator1_id_idx" ON "applicants"("evaluator1_id");

ALTER TABLE "applicants" ADD COLUMN "evaluator2_id" TEXT;

ALTER TABLE "applicants"
  ADD CONSTRAINT "applicants_evaluator2_id_fkey"
  FOREIGN KEY ("evaluator2_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "applicants_evaluator2_id_idx" ON "applicants"("evaluator2_id");
