CREATE TABLE "unavailability" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unavailability_user_date" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "unavailability" ADD CONSTRAINT "unavailability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;