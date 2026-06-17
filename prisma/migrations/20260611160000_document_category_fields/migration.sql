ALTER TABLE "communication_documents" RENAME COLUMN "title" TO "description";

ALTER TABLE "communication_documents"
ADD COLUMN "category_id" TEXT,
ADD COLUMN "sub_category" TEXT NOT NULL DEFAULT '';

CREATE INDEX "communication_documents_category_id_idx" ON "communication_documents"("category_id");

ALTER TABLE "communication_documents"
ADD CONSTRAINT "communication_documents_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "communication_document_categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
