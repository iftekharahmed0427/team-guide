ALTER TABLE "payment_role" ADD COLUMN "paid_per_ticket" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "payment_role" SET "paid_per_ticket" = true WHERE "id" = 'tickets';