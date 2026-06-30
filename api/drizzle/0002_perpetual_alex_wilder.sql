ALTER TABLE "products" ADD CONSTRAINT "products_sale_price_nonnegative" CHECK ("products"."sale_price" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_cost_price_nonnegative" CHECK ("products"."cost_price" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonnegative" CHECK ("products"."stock_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_minimum_stock_nonnegative" CHECK ("products"."minimum_stock" >= 0);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quantity_nonnegative" CHECK ("stock_movements"."quantity" >= 0);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_previous_nonnegative" CHECK ("stock_movements"."previous_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_resulting_nonnegative" CHECK ("stock_movements"."resulting_quantity" >= 0);