CREATE TABLE "game_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_category_name_unique" UNIQUE("name")
);
