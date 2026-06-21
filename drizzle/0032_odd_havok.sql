CREATE TABLE "payment_role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_override" ADD COLUMN "role_id" text;--> statement-breakpoint
ALTER TABLE "payment_override" ADD CONSTRAINT "payment_override_role_id_payment_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."payment_role"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "payment_role" ("id", "name", "sort_order") VALUES
	('tickets', 'Tickets', 0),
	('discord-manager', 'Discord Manager', 1),
	('backend', 'Backend', 2),
	('disputes', 'Disputes', 3),
	('management', 'Management', 4)
ON CONFLICT ("id") DO NOTHING;