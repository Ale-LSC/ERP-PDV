ALTER TABLE "sale_payments" ADD COLUMN "received_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sale_payments" ADD COLUMN "change_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_received_valid" CHECK ("sale_payments"."received_amount" is null or "sale_payments"."received_amount" >= "sale_payments"."amount");--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_change_nonnegative" CHECK ("sale_payments"."change_amount" >= 0);