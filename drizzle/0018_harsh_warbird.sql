ALTER TABLE "bot_setting" ADD COLUMN "announcement_role_id" text;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "announcement_ping_text" text DEFAULT '' NOT NULL;