CREATE TYPE "public"."financial_entry_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."financial_entry_type" AS ENUM('payable', 'receivable');--> statement-breakpoint
CREATE TABLE "financial_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" "financial_entry_type" NOT NULL,
	"description" varchar(220) NOT NULL,
	"category" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"status" "financial_entry_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_entries_amount_positive" CHECK ("financial_entries"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_entries_company_due_index" ON "financial_entries" USING btree ("company_id","due_date");--> statement-breakpoint
CREATE INDEX "financial_entries_company_status_index" ON "financial_entries" USING btree ("company_id","status");