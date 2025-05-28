ALTER TABLE "prediction_question" ALTER COLUMN "question" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "prediction_question" DROP COLUMN IF EXISTS "description";