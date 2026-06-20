CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" text DEFAULT '' NOT NULL,
	"ticket_type" text DEFAULT '' NOT NULL,
	"ticket_date" date,
	"member_id" text,
	"member_name" text DEFAULT '' NOT NULL,
	"reviewer_id" text,
	"reviewer_name" text DEFAULT '' NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"possible_score" integer DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_score" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"criterion_key" text NOT NULL,
	"na" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"comment" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_score" ADD CONSTRAINT "audit_score_audit_id_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE cascade ON UPDATE no action;