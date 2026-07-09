CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(16) NOT NULL,
	"resource" varchar(300) NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_lot_allocations" (
	"sale_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	CONSTRAINT "sale_lot_allocations_sale_id_lot_id_pk" PRIMARY KEY("sale_id","lot_id"),
	CONSTRAINT "sale_lot_allocation_quantity_positive" CHECK ("sale_lot_allocations"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "service_contracts" ADD COLUMN "next_billing_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lot_allocations" ADD CONSTRAINT "sale_lot_allocations_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lot_allocations" ADD CONSTRAINT "sale_lot_allocations_lot_id_product_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."product_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_company_created_idx" ON "audit_logs" USING btree ("company_id","created_at");