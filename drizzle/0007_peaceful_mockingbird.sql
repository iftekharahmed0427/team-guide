CREATE TABLE "note" (
	"id" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"author_id" text,
	"author_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
