ALTER TABLE "user" ADD COLUMN "gambling_losses" numeric(20, 8) DEFAULT '0.00000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gambling_wins" numeric(20, 8) DEFAULT '0.00000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "halloween_badge_2025" boolean DEFAULT false;