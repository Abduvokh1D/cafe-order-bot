ALTER TABLE "cafes" ADD COLUMN "delivery_fee" integer;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "free_delivery_from" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_delivery_fee_check" CHECK ("cafes"."delivery_fee" >= 0);--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_free_delivery_from_check" CHECK ("cafes"."free_delivery_from" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_fee_check" CHECK ("orders"."delivery_fee" >= 0);