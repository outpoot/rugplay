DO $$ BEGIN
 CREATE TYPE "public"."prediction_market_status" AS ENUM('ACTIVE', 'RESOLVED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prediction_bet" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"side" boolean NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"actual_winnings" numeric(20, 8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prediction_question" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"question" text NOT NULL,
	"description" text,
	"status" "prediction_market_status" DEFAULT 'ACTIVE' NOT NULL,
	"resolution_date" timestamp with time zone NOT NULL,
	"ai_resolution" boolean,
	"total_yes_amount" numeric(20, 8) DEFAULT '0.00000000' NOT NULL,
	"total_no_amount" numeric(20, 8) DEFAULT '0.00000000' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"requires_web_search" boolean DEFAULT false NOT NULL,
	"validation_reason" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prediction_bet" ADD CONSTRAINT "prediction_bet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prediction_bet" ADD CONSTRAINT "prediction_bet_question_id_prediction_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."prediction_question"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prediction_question" ADD CONSTRAINT "prediction_question_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_bet_user_id_idx" ON "prediction_bet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_bet_question_id_idx" ON "prediction_bet" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_bet_user_question_idx" ON "prediction_bet" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_question_creator_id_idx" ON "prediction_question" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_question_status_idx" ON "prediction_question" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_question_resolution_date_idx" ON "prediction_question" USING btree ("resolution_date");