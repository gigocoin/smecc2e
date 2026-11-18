-- CreateEnum
CREATE TYPE "PreFinancingTranche" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateTable
CREATE TABLE "pre_financings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "tranche" "PreFinancingTranche" NOT NULL,
    "university_id" TEXT NOT NULL,
    "finance_officer_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "release_date" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_financings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_financings_reference_key" ON "pre_financings"("reference");

-- CreateIndex
CREATE INDEX "pre_financings_tranche_idx" ON "pre_financings"("tranche");

-- CreateIndex
CREATE INDEX "pre_financings_university_id_idx" ON "pre_financings"("university_id");

-- CreateIndex
CREATE INDEX "pre_financings_finance_officer_id_idx" ON "pre_financings"("finance_officer_id");

-- CreateIndex
CREATE INDEX "pre_financings_release_date_idx" ON "pre_financings"("release_date");

-- CreateIndex
CREATE INDEX "pre_financings_created_at_idx" ON "pre_financings"("created_at");

-- AddForeignKey
ALTER TABLE "pre_financings" ADD CONSTRAINT "pre_financings_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_financings" ADD CONSTRAINT "pre_financings_finance_officer_id_fkey" FOREIGN KEY ("finance_officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_financings" ADD CONSTRAINT "pre_financings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
