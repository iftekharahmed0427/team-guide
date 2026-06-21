CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"member_name" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'commission' NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'owed' NOT NULL,
	"method" text DEFAULT '' NOT NULL,
	"period_label" text DEFAULT '' NOT NULL,
	"paid_at" date,
	"reference" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"commission_id" text,
	"created_by_id" text,
	"created_by_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
