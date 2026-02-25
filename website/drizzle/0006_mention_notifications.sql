ALTER TYPE "notification_type" ADD VALUE 'MENTION';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "disable_mentions" boolean DEFAULT false NOT NULL;