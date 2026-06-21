CREATE TABLE "comp_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"member_id" text,
	"member_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'Tickets' NOT NULL,
	"tickets" integer DEFAULT 0 NOT NULL,
	"ticket_rate" double precision DEFAULT 1 NOT NULL,
	"base_compensation" double precision DEFAULT 0 NOT NULL,
	"bonus_included" boolean DEFAULT false NOT NULL,
	"bonus_amount" double precision DEFAULT 0 NOT NULL,
	"commission" double precision DEFAULT 0 NOT NULL,
	"recovered_revenue" double precision DEFAULT 0 NOT NULL,
	"reimbursement" double precision DEFAULT 0 NOT NULL,
	"paypal_email" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comp_period" (
	"id" text PRIMARY KEY NOT NULL,
	"number" integer,
	"label" text DEFAULT '' NOT NULL,
	"start_date" date,
	"end_date" date,
	"review_bonus_label" text DEFAULT 'Trust Pilot Bonus' NOT NULL,
	"review_bonus_enabled" boolean DEFAULT false NOT NULL,
	"review_bonus_amount" double precision DEFAULT 50 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"finalized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comp_entry" ADD CONSTRAINT "comp_entry_period_id_comp_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."comp_period"("id") ON DELETE cascade ON UPDATE no action;