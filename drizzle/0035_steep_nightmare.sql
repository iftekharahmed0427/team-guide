ALTER TABLE "payment_override" ADD COLUMN "bonus" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_override" ADD COLUMN "recovered_revenue" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_role" ADD COLUMN "bonus_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "payment_role" SET "bonus_eligible" = true WHERE "id" = 'disputes';