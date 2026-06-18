ALTER TABLE "bot_setting" ADD COLUMN "announcement_channel_id" text;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "announcement_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "announcement_title" text DEFAULT 'Ticket count for this period' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "announcement_color" text DEFAULT '#5865f2' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "announcement_intro" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_setting" ADD COLUMN "announcement_footer" text DEFAULT 'Team Guide' NOT NULL;