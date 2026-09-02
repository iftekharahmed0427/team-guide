ALTER TABLE "note" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "updated_at" timestamp;