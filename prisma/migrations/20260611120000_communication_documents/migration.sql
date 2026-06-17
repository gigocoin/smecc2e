CREATE TABLE "communication_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_by_name" TEXT NOT NULL,
    "uploaded_by_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "communication_documents_created_at_idx" ON "communication_documents"("created_at");
