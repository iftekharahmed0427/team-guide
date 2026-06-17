CREATE TABLE "commission" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"renewal_date" date,
	"product_price" double precision,
	"commission_rate" double precision DEFAULT 15 NOT NULL,
	"submitted_by_id" text,
	"submitted_by_name" text DEFAULT '' NOT NULL,
	"reviewed_by_name" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
