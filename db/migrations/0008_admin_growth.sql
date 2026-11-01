CREATE TYPE "public"."admin_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "promo_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cafe_id" integer NOT NULL,
	"code" text NOT NULL,
	"type" "promo_type" NOT NULL,
	"value" integer NOT NULL,
	"min_order_amount" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"is_once_per_customer" boolean DEFAULT true NOT NULL,
	"expires_on" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_cafe_id_id_unique" UNIQUE("cafe_id","id"),
	CONSTRAINT "promo_codes_value_check" CHECK ("promo_codes"."value" > 0 AND ("promo_codes"."type" <> 'percent' OR "promo_codes"."value" <= 100)),
	CONSTRAINT "promo_codes_min_order_check" CHECK ("promo_codes"."min_order_amount" >= 0),
	CONSTRAINT "promo_codes_max_uses_check" CHECK ("promo_codes"."max_uses" > 0)
);
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "role" "admin_role" DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "is_accepting_orders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "opens_at_minutes" integer;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "closes_at_minutes" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "promo_codes_cafe_code_unique" ON "promo_codes" USING btree ("cafe_id","code") WHERE NOT "promo_codes"."is_archived";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_fk" FOREIGN KEY ("cafe_id","promo_code_id") REFERENCES "public"."promo_codes"("cafe_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_hours_check" CHECK (("cafes"."opens_at_minutes" IS NULL AND "cafes"."closes_at_minutes" IS NULL) OR ("cafes"."opens_at_minutes" BETWEEN 0 AND 1439 AND "cafes"."closes_at_minutes" BETWEEN 0 AND 1439 AND "cafes"."opens_at_minutes" <> "cafes"."closes_at_minutes"));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_amount_check" CHECK ("orders"."discount_amount" >= 0);