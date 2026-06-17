CREATE TABLE "ticket_count" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"previous_total" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_channel" ADD COLUMN "last_seen_message_id" text;--> statement-breakpoint
ALTER TABLE "report_channel" ADD COLUMN "current_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_channel" ADD COLUMN "previous_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_channel" ADD COLUMN "counted_at" timestamp;