CREATE TABLE "communication_document_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_document_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "communication_document_categories_name_key" ON "communication_document_categories"("name");

CREATE UNIQUE INDEX "communication_document_categories_slug_key" ON "communication_document_categories"("slug");

CREATE INDEX "communication_document_categories_created_at_idx" ON "communication_document_categories"("created_at");
