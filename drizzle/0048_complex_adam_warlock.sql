CREATE TABLE "review_source" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_source_name_unique" UNIQUE("name")
);
