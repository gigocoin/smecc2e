-- Per-evaluator review decisions on assigned applications
CREATE TYPE "EvaluatorReviewStatus" AS ENUM ('pending', 'accepted', 'rejected', 'evaluated');

ALTER TABLE "applicants"
  ADD COLUMN "evaluator1_review_status" "EvaluatorReviewStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "evaluator2_review_status" "EvaluatorReviewStatus" NOT NULL DEFAULT 'pending';
