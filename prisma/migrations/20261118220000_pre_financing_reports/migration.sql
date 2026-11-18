-- CreateTable
CREATE TABLE "pre_financing_reports" (
    "id" TEXT NOT NULL,
    "tranche" "PreFinancingTranche" NOT NULL,
    "finance_officer_id" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "finance_officer_name" TEXT NOT NULL,
    "year" VARCHAR(4) NOT NULL,
    "month" VARCHAR(2) NOT NULL,
    "financial_report_file_name" TEXT NOT NULL,
    "financial_report_file_data_url" TEXT NOT NULL,
    "ledger_file_name" TEXT NOT NULL,
    "ledger_file_data_url" TEXT NOT NULL,
    "supporting_document_file_name" TEXT NOT NULL,
    "supporting_document_file_data_url" TEXT NOT NULL,
    "contribution_to_scholarship" DECIMAL(14,2) NOT NULL,
    "contribution_to_institution" DECIMAL(14,2) NOT NULL,
    "special_needs" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_financing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pre_financing_reports_tranche_idx" ON "pre_financing_reports"("tranche");

-- CreateIndex
CREATE INDEX "pre_financing_reports_finance_officer_id_idx" ON "pre_financing_reports"("finance_officer_id");

-- CreateIndex
CREATE INDEX "pre_financing_reports_year_month_idx" ON "pre_financing_reports"("year", "month");

-- CreateIndex
CREATE INDEX "pre_financing_reports_created_at_idx" ON "pre_financing_reports"("created_at");

-- AddForeignKey
ALTER TABLE "pre_financing_reports" ADD CONSTRAINT "pre_financing_reports_finance_officer_id_fkey" FOREIGN KEY ("finance_officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
