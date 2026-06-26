CREATE TABLE "payment_period" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"start_date" date,
	"end_date" date,
	"ticket_rate" double precision DEFAULT 1 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_period_row" (
	"id" text PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"member_id" text,
	"member_name" text DEFAULT '' NOT NULL,
	"role_name" text DEFAULT '' NOT NULL,
	"paid_per_ticket" boolean DEFAULT true NOT NULL,
	"tickets" integer DEFAULT 0 NOT NULL,
	"base_compensation" double precision DEFAULT 0 NOT NULL,
	"bonus" double precision DEFAULT 0 NOT NULL,
	"commission" double precision DEFAULT 0 NOT NULL,
	"amount_override" double precision,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_period_row" ADD CONSTRAINT "payment_period_row_period_id_payment_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payment_period"("id") ON DELETE cascade ON UPDATE no action;