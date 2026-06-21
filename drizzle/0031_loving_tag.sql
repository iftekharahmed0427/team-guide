CREATE TABLE "payment_override" (
	"user_id" text PRIMARY KEY NOT NULL,
	"ticket_override" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_override" ADD CONSTRAINT "payment_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;