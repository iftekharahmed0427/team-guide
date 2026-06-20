CREATE TABLE "audit_screenshot" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"image_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_screenshot" ADD CONSTRAINT "audit_screenshot_audit_id_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE cascade ON UPDATE no action;