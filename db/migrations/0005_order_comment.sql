ALTER TABLE "orders" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cutlery_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cutlery_count_check" CHECK ("orders"."cutlery_count" >= 0);