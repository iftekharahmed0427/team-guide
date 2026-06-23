ALTER TABLE "review_setting" ALTER COLUMN "threshold" SET DEFAULT 50;--> statement-breakpoint
-- Carry the existing singleton off the old default (10) to the new default (50).
UPDATE "review_setting" SET "threshold" = 50 WHERE "threshold" = 10;