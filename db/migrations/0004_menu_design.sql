CREATE TABLE "banners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cafe_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "delivery_min_minutes" integer;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "delivery_max_minutes" integer;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banners_cafe_idx" ON "banners" USING btree ("cafe_id");--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_delivery_time_check" CHECK (("cafes"."delivery_min_minutes" IS NULL AND "cafes"."delivery_max_minutes" IS NULL) OR ("cafes"."delivery_min_minutes" > 0 AND "cafes"."delivery_max_minutes" >= "cafes"."delivery_min_minutes"));