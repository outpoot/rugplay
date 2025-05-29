ALTER TABLE "user" ADD COLUMN "volume_master" numeric(3, 2) DEFAULT '0.70' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "volume_muted" boolean DEFAULT false NOT NULL;