CREATE TYPE "public"."company_segment" AS ENUM('market', 'industry', 'retail', 'services', 'other');--> statement-breakpoint
CREATE TYPE "public"."company_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."replenishment_status" AS ENUM('pending', 'fulfilled', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."company_role" ADD VALUE 'finance' BEFORE 'cashier';--> statement-breakpoint
ALTER TYPE "public"."company_role" ADD VALUE 'stock' BEFORE 'cashier';--> statement-breakpoint
CREATE TABLE "replenishment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"note" varchar(240),
	"status" "replenishment_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "segment" "company_segment" DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "size" "company_size" DEFAULT 'small' NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "replenishment_company_status_index" ON "replenishment_requests" USING btree ("company_id","status");