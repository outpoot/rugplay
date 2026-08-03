CREATE TYPE "public"."season_status" AS ENUM('UPCOMING', 'ACTIVE', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."season_trophy_tier" AS ENUM('CHAMPION', 'RUNNER_UP', 'THIRD', 'TOP_10', 'TOP_100', 'PARTICIPANT');--> statement-breakpoint
CREATE TABLE "season" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"status" "season_status" DEFAULT 'UPCOMING' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"ranked_stake" numeric(30, 8) NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "season_participant" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"prestige_at_entry" integer DEFAULT 0 NOT NULL,
	"score_multiplier" numeric(6, 4) DEFAULT '1.0000' NOT NULL,
	"starting_stake" numeric(30, 8) NOT NULL,
	"sacrificed" numeric(30, 8) DEFAULT '0.00000000' NOT NULL,
	"final_score" numeric(42, 8),
	"final_rank" integer,
	CONSTRAINT "season_participant_unique" UNIQUE("season_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "season_trophy" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"tier" "season_trophy_tier" NOT NULL,
	"score" numeric(42, 8) NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_trophy_unique" UNIQUE("season_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "season_participant" ADD CONSTRAINT "season_participant_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_participant" ADD CONSTRAINT "season_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_trophy" ADD CONSTRAINT "season_trophy_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_trophy" ADD CONSTRAINT "season_trophy_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "season_status_idx" ON "season" USING btree ("status");--> statement-breakpoint
CREATE INDEX "season_ends_at_idx" ON "season" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "season_participant_season_id_idx" ON "season_participant" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "season_participant_user_id_idx" ON "season_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "season_trophy_user_id_idx" ON "season_trophy" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "season_trophy_season_id_idx" ON "season_trophy" USING btree ("season_id");
