CREATE TABLE "evaluation_rubric_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "weights" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "evaluation_rubric_settings_pkey" PRIMARY KEY ("id")
);
