-- CreateTable
CREATE TABLE "interview_rubric_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "criteria" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_rubric_settings_pkey" PRIMARY KEY ("id")
);
