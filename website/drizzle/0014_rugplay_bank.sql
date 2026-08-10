-- RugPlay Bank: treasury (central bank) + official-coin support on `coin`.
--
-- IF NOT EXISTS / DO guards throughout, matching 0013_changelog_system.sql,
-- so this is safe to run against a DB that's been synced ahead of the
-- migration via `drizzle-kit push`.

ALTER TABLE "coin" ADD COLUMN IF NOT EXISTS "is_official" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "coin" ADD COLUMN IF NOT EXISTS "max_holder_percent" numeric(5, 2);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coin_is_official_idx" ON "coin" USING btree ("is_official");
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."treasury_ledger_direction" AS ENUM('IN', 'OUT');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."treasury_ledger_source" AS ENUM('TRADING_FEE', 'CASH_TRANSFER_FEE', 'DAILY_REWARD', 'ARCADE_HOUSE_EDGE', 'ARCADE_PAYOUT', 'PROMO_CODE', 'PREDICTION_MARKET_FEE', 'ADMIN_ADJUSTMENT', 'SEED');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treasury" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"balance" numeric(30, 8) DEFAULT '0.00000000' NOT NULL,
	"total_inflow" numeric(30, 8) DEFAULT '0.00000000' NOT NULL,
	"total_outflow" numeric(30, 8) DEFAULT '0.00000000' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treasury_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"direction" "treasury_ledger_direction" NOT NULL,
	"source" "treasury_ledger_source" NOT NULL,
	"amount" numeric(30, 8) NOT NULL,
	"balance_after" numeric(30, 8) NOT NULL,
	"user_id" integer,
	"reference_type" varchar(50),
	"reference_id" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "treasury_ledger" ADD CONSTRAINT "treasury_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treasury_ledger_created_at_idx" ON "treasury_ledger" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treasury_ledger_source_idx" ON "treasury_ledger" USING btree ("source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treasury_ledger_user_id_idx" ON "treasury_ledger" USING btree ("user_id");
