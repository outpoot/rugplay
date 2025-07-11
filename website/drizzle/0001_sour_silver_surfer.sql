ALTER TABLE "user" ADD COLUMN "bank_balance" numeric(20, 8) DEFAULT '0.00000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_bank_activity" timestamp with time zone;