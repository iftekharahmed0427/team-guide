CREATE TABLE "reset_log" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"channel_name" text,
	"actor_id" text,
	"actor_name" text DEFAULT '' NOT NULL,
	"period_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
