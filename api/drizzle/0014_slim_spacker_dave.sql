CREATE TABLE "product_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"code" varchar(80) NOT NULL,
	"expires_at" date NOT NULL,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_lots_quantity_nonnegative" CHECK ("product_lots"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"promotional_price" numeric(12, 2) NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_price_positive" CHECK ("promotions"."promotional_price" >= 0),
	CONSTRAINT "promotions_period_valid" CHECK ("promotions"."ends_at" > "promotions"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_lots_branch_product_code_unique" ON "product_lots" USING btree ("branch_id","product_id","code");--> statement-breakpoint
CREATE INDEX "product_lots_company_expiry_idx" ON "product_lots" USING btree ("company_id","expires_at");--> statement-breakpoint
CREATE INDEX "promotions_company_product_idx" ON "promotions" USING btree ("company_id","product_id");