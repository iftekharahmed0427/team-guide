CREATE TABLE "bot_setting" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"period_anchor" text DEFAULT '2026-06-26' NOT NULL,
	"period_days" integer DEFAULT 14 NOT NULL,
	"post_hour" integer DEFAULT 17 NOT NULL,
	"post_minute" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_channel" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text,
	"name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_channel_channel_unique" UNIQUE("channel_id")
);
