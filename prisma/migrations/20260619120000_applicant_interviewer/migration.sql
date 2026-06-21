-- Assign optional interviewer and interview score per application
ALTER TABLE "applicants" ADD COLUMN "interviewer_id" TEXT;
ALTER TABLE "applicants" ADD COLUMN "interview_score" DOUBLE PRECISION;

ALTER TABLE "applicants"
  ADD CONSTRAINT "applicants_interviewer_id_fkey"
  FOREIGN KEY ("interviewer_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "applicants_interviewer_id_idx" ON "applicants"("interviewer_id");
