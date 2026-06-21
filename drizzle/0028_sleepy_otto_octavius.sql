CREATE TABLE "payment_eligibility" (
	"user_id" text PRIMARY KEY NOT NULL,
	"eligible" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_eligibility" ADD CONSTRAINT "payment_eligibility_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;