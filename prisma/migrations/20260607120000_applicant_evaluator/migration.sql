-- Assign optional evaluator to each application
ALTER TABLE "applicants" ADD COLUMN "evaluator_id" TEXT;

ALTER TABLE "applicants"
  ADD CONSTRAINT "applicants_evaluator_id_fkey"
  FOREIGN KEY ("evaluator_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "applicants_evaluator_id_idx" ON "applicants"("evaluator_id");
