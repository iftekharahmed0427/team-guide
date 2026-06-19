CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"image_url" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"added_by_id" text,
	"added_by_name" text DEFAULT '' NOT NULL,
	"period_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_period_id_report_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."report_period"("id") ON DELETE cascade ON UPDATE no action;