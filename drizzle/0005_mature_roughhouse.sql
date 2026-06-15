CREATE TABLE "guide" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"game" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"author_id" text,
	"author_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guide_slug_unique" UNIQUE("slug")
);
