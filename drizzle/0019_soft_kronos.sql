CREATE TABLE "report_period" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp DEFAULT now() NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_period_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"user_id" text,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_period_entry" ADD CONSTRAINT "report_period_entry_period_id_report_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."report_period"("id") ON DELETE cascade ON UPDATE no action;