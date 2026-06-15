CREATE TABLE "board_task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
