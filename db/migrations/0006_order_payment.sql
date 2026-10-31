CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method" DEFAULT 'cash' NOT NULL;