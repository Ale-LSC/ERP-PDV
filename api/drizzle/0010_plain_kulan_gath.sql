CREATE TABLE "branch_stocks" (
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branch_stocks_branch_id_product_id_pk" PRIMARY KEY("branch_id","product_id")
);
--> statement-breakpoint
DROP INDEX "cash_sessions_operator_open_unique";--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
UPDATE "cash_sessions" t SET "branch_id" = b."id" FROM "branches" b WHERE b."company_id" = t."company_id" AND b."is_headquarters" = true;--> statement-breakpoint
UPDATE "purchases" t SET "branch_id" = b."id" FROM "branches" b WHERE b."company_id" = t."company_id" AND b."is_headquarters" = true;--> statement-breakpoint
UPDATE "replenishment_requests" t SET "branch_id" = b."id" FROM "branches" b WHERE b."company_id" = t."company_id" AND b."is_headquarters" = true;--> statement-breakpoint
UPDATE "sales" t SET "branch_id" = b."id" FROM "branches" b WHERE b."company_id" = t."company_id" AND b."is_headquarters" = true;--> statement-breakpoint
UPDATE "stock_movements" t SET "branch_id" = b."id" FROM "branches" b WHERE b."company_id" = t."company_id" AND b."is_headquarters" = true;--> statement-breakpoint
INSERT INTO "branch_stocks" ("branch_id", "product_id", "quantity") SELECT b."id", p."id", p."stock_quantity" FROM "products" p JOIN "branches" b ON b."company_id" = p."company_id" AND b."is_headquarters" = true;--> statement-breakpoint
ALTER TABLE "cash_sessions" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_stocks" ADD CONSTRAINT "branch_stocks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_stocks" ADD CONSTRAINT "branch_stocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_operator_open_unique" ON "cash_sessions" USING btree ("branch_id","opened_by") WHERE "cash_sessions"."status" = 'open';
