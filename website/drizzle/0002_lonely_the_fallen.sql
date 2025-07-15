ALTER TABLE "coin" ADD COLUMN "trading_unlocks_at" timestamp;--> statement-breakpoint
ALTER TABLE "coin" ADD COLUMN "is_locked" boolean DEFAULT true NOT NULL;