CREATE TABLE "shift" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	"checked_out_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;