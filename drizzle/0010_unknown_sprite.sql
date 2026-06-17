CREATE TABLE "bot_status" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"state" text DEFAULT 'offline' NOT NULL,
	"bot_tag" text,
	"last_error" text,
	"last_error_at" timestamp,
	"last_heartbeat_at" timestamp,
	"last_report_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "presence_status" text DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "presence_activity_type" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "presence_activity_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "run_requested_at" timestamp;