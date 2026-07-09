CREATE TYPE "public"."module_record_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "module_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"module" "company_module" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "module_record_status" DEFAULT 'pending' NOT NULL,
	"due_at" timestamp,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "module_records" ADD CONSTRAINT "module_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_records" ADD CONSTRAINT "module_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "module_records_company_module_idx" ON "module_records" USING btree ("company_id","module");