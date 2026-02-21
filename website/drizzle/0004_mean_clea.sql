CREATE TABLE IF NOT EXISTS "user_achievement" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_id" varchar(50) NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievement_unique" UNIQUE("user_id","achievement_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "total_arcade_games_played" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "arcade_win_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "arcade_best_win_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "total_arcade_wagered" numeric(20, 8) DEFAULT '0.00000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "crates_opened" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievement_user_id_idx" ON "user_achievement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievement_achievement_id_idx" ON "user_achievement" USING btree ("achievement_id");