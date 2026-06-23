CREATE TABLE "review_bonus_member" (
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review" DROP CONSTRAINT "review_assigned_to_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "review_bonus_member" ADD CONSTRAINT "review_bonus_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" DROP COLUMN "assigned_to_id";--> statement-breakpoint
ALTER TABLE "review" DROP COLUMN "assigned_to_name";