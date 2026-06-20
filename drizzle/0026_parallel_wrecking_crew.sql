CREATE TABLE "member_game" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"level" text DEFAULT 'primary' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_game_unique" UNIQUE("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "member_game" ADD CONSTRAINT "member_game_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_game" ADD CONSTRAINT "member_game_game_id_game_category_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_category"("id") ON DELETE cascade ON UPDATE no action;