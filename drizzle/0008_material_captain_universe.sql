CREATE TABLE "board_task_assignee" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_task_assignee_unique" UNIQUE("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "board_task_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"body" text NOT NULL,
	"author_id" text,
	"author_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_task_assignee" ADD CONSTRAINT "board_task_assignee_task_id_board_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."board_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_task_assignee" ADD CONSTRAINT "board_task_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_task_comment" ADD CONSTRAINT "board_task_comment_task_id_board_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."board_task"("id") ON DELETE cascade ON UPDATE no action;