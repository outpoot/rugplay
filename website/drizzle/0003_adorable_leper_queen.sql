ALTER TABLE "coin" ADD COLUMN "pump_fee_rate" numeric(10, 8) DEFAULT '0.00500000' NOT NULL;--> statement-breakpoint
ALTER TABLE "coin" ADD COLUMN "burn_rate" numeric(10, 8) DEFAULT '0.00100000' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "pump_fee_applied" numeric(30, 8) DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "tokens_burned" numeric(30, 8) DEFAULT '0.00000000';