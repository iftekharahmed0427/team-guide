ALTER TABLE "payment_eligibility" ADD COLUMN "base_compensation" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_eligibility" ADD COLUMN "bonus_amount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_eligibility" ADD COLUMN "commission" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_eligibility" ADD COLUMN "reimbursement" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_eligibility" ADD COLUMN "paypal_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_eligibility" ADD COLUMN "note" text DEFAULT '' NOT NULL;