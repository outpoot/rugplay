CREATE TYPE "public"."news_article_type" AS ENUM('RUG_PULL', 'COIN_PUMP', 'COIN_CREATED', 'COIN_MILESTONE', 'HOPIUM_RESOLVED', 'HOPIUM_TRENDING', 'WHALE_TRADE', 'LEADERBOARD_SHAKEUP', 'SEASON_EVENT', 'PLATFORM');--> statement-breakpoint
CREATE TYPE "public"."news_article_source" AS ENUM('AI', 'TEMPLATE');--> statement-breakpoint
CREATE TYPE "public"."news_reaction_type" AS ENUM('LIKE', 'DISLIKE');--> statement-breakpoint
CREATE TYPE "public"."news_report_status" AS ENUM('OPEN', 'REVIEWED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "news_article" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "news_article_type" NOT NULL,
	"source" "news_article_source" DEFAULT 'TEMPLATE' NOT NULL,
	"headline" varchar(160) NOT NULL,
	"summary" varchar(280) NOT NULL,
	"body" text NOT NULL,
	"cover_image" text,
	"cover_image_attribution" varchar(200),
	"related_coin_id" integer,
	"related_user_id" integer,
	"related_question_id" integer,
	"metadata" text,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"dislikes_count" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"trending_score" numeric(12, 4) DEFAULT '0' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_article_reaction" (
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"type" "news_reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_reaction_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "news_article_report" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"reason" varchar(300),
	"status" "news_report_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_report_user_article_unique" UNIQUE("user_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "news_article" ADD CONSTRAINT "news_article_related_coin_id_coin_id_fk" FOREIGN KEY ("related_coin_id") REFERENCES "public"."coin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article" ADD CONSTRAINT "news_article_related_user_id_user_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article" ADD CONSTRAINT "news_article_related_question_id_prediction_question_id_fk" FOREIGN KEY ("related_question_id") REFERENCES "public"."prediction_question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_reaction" ADD CONSTRAINT "news_article_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_reaction" ADD CONSTRAINT "news_article_reaction_article_id_news_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_report" ADD CONSTRAINT "news_article_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_report" ADD CONSTRAINT "news_article_report_article_id_news_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_article_type_idx" ON "news_article" USING btree ("type");--> statement-breakpoint
CREATE INDEX "news_article_created_at_idx" ON "news_article" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_article_trending_idx" ON "news_article" USING btree ("trending_score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_article_related_coin_idx" ON "news_article" USING btree ("related_coin_id");--> statement-breakpoint
CREATE INDEX "news_article_related_user_idx" ON "news_article" USING btree ("related_user_id");--> statement-breakpoint
CREATE INDEX "news_article_visible_feed_idx" ON "news_article" USING btree ("is_hidden","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_article_reaction_article_id_idx" ON "news_article_reaction" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "news_article_report_status_idx" ON "news_article_report" USING btree ("status");
