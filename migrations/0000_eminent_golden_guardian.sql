CREATE TABLE "applied_signatures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"signature_id" varchar NOT NULL,
	"page_number" integer NOT NULL,
	"position" jsonb NOT NULL,
	"applied_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_signatures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"company_name" text NOT NULL,
	"location" text NOT NULL,
	"time_zone" text NOT NULL,
	"certificate" text NOT NULL,
	"private_key" text NOT NULL,
	"signature_image" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text NOT NULL,
	"page_count" integer NOT NULL,
	"page_sizes" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"is_read_only" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"company_name" text,
	"is_verified" boolean DEFAULT false,
	"verification_token" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applied_signatures" ADD CONSTRAINT "applied_signatures_document_id_pdf_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdf_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applied_signatures" ADD CONSTRAINT "applied_signatures_signature_id_digital_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."digital_signatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_documents" ADD CONSTRAINT "pdf_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;