CREATE TYPE "public"."production_order_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "bill_of_material_items" (
	"bom_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	CONSTRAINT "bill_of_material_items_bom_id_product_id_pk" PRIMARY KEY("bom_id","product_id"),
	CONSTRAINT "bom_item_quantity_positive" CHECK ("bill_of_material_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "bills_of_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"yield_quantity" numeric(14, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bom_yield_positive" CHECK ("bills_of_materials"."yield_quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"bom_id" uuid NOT NULL,
	"planned_quantity" numeric(14, 3) NOT NULL,
	"produced_quantity" numeric(14, 3),
	"status" "production_order_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_planned_positive" CHECK ("production_orders"."planned_quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "bill_of_material_items" ADD CONSTRAINT "bill_of_material_items_bom_id_bills_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bills_of_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_of_material_items" ADD CONSTRAINT "bill_of_material_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills_of_materials" ADD CONSTRAINT "bills_of_materials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills_of_materials" ADD CONSTRAINT "bills_of_materials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bom_id_bills_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bills_of_materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bom_company_product_unique" ON "bills_of_materials" USING btree ("company_id","product_id");--> statement-breakpoint
CREATE INDEX "production_orders_company_status_idx" ON "production_orders" USING btree ("company_id","status");