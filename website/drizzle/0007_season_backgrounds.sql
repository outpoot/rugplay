ALTER TABLE "season" ADD COLUMN "background_image" varchar(2048);--> statement-breakpoint
UPDATE "season" SET "background_image" = '/season1_background.webp' WHERE "number" = 1;
