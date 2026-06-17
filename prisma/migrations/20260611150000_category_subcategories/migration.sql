ALTER TABLE "communication_document_categories"
ADD COLUMN "sub_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "communication_document_categories"
DROP COLUMN "description";
