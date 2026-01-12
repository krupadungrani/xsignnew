ALTER TABLE "digital_signatures" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "pdf_documents" DROP COLUMN "is_read_only";