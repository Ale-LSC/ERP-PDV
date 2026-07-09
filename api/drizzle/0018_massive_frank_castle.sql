CREATE TYPE "public"."fiscal_document_status" AS ENUM('draft', 'queued', 'authorized', 'rejected', 'cancelled', 'denied', 'offline');--> statement-breakpoint
CREATE TYPE "public"."fiscal_document_type" AS ENUM('nfce', 'nfe');--> statement-breakpoint
CREATE TYPE "public"."payment_integration_status" AS ENUM('manual', 'pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "fiscal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"type" "fiscal_document_type" DEFAULT 'nfce' NOT NULL,
	"status" "fiscal_document_status" DEFAULT 'draft' NOT NULL,
	"provider" varchar(80) DEFAULT 'none' NOT NULL,
	"external_id" varchar(160),
	"access_key" varchar(80),
	"number" varchar(40),
	"series" varchar(20),
	"protocol" varchar(120),
	"xml_url" varchar(600),
	"pdf_url" varchar(600),
	"error_message" varchar(500),
	"provider_payload" jsonb DEFAULT '{}'::jsonb,
	"issued_by" uuid,
	"issued_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"sale_payment_id" uuid NOT NULL,
	"provider" varchar(80) DEFAULT 'manual' NOT NULL,
	"status" "payment_integration_status" DEFAULT 'manual' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"external_id" varchar(160),
	"authorization_code" varchar(80),
	"nsu" varchar(80),
	"error_message" varchar(500),
	"provider_payload" jsonb DEFAULT '{}'::jsonb,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"authorized_at" timestamp,
	"captured_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_amount_positive" CHECK ("payment_transactions"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_sale_payment_id_sale_payments_id_fk" FOREIGN KEY ("sale_payment_id") REFERENCES "public"."sale_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_documents_sale_type_unique" ON "fiscal_documents" USING btree ("sale_id","type");--> statement-breakpoint
CREATE INDEX "fiscal_documents_company_status_idx" ON "fiscal_documents" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "fiscal_documents_access_key_idx" ON "fiscal_documents" USING btree ("access_key");--> statement-breakpoint
CREATE INDEX "payment_transactions_company_status_idx" ON "payment_transactions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "payment_transactions_sale_idx" ON "payment_transactions" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_external_idx" ON "payment_transactions" USING btree ("provider","external_id");