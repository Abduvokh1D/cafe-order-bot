ALTER TABLE "cafes" ADD COLUMN "bot_token" text;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "staff_chat_id" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "request_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "staff_message_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cafe_request_unique" UNIQUE("cafe_id","request_id");