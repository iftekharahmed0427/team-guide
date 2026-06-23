CREATE TABLE "review_setting" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"threshold" integer DEFAULT 10 NOT NULL,
	"amount" double precision DEFAULT 50 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review" ADD COLUMN "assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "review" ADD COLUMN "assigned_to_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;