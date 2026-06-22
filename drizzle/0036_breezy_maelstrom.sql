CREATE TABLE "dispute" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"image_url" text NOT NULL,
	"submitted_by_id" text,
	"submitted_by_name" text DEFAULT '' NOT NULL,
	"period_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dispute_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_period_id_report_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."report_period"("id") ON DELETE cascade ON UPDATE no action;