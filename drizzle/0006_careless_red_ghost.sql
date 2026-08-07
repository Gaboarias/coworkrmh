ALTER TYPE "public"."send_status" ADD VALUE 'suppressed';--> statement-breakpoint
ALTER TYPE "public"."send_status" ADD VALUE 'paused';--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD COLUMN "invalidated_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaign_sends" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;