CREATE TABLE "news_article_view" (
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"dwell_ms" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_view_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "news_article_share" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"article_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_article_view" ADD CONSTRAINT "news_article_view_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_view" ADD CONSTRAINT "news_article_view_article_id_news_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_share" ADD CONSTRAINT "news_article_share_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_article_share" ADD CONSTRAINT "news_article_share_article_id_news_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_article_view_article_id_idx" ON "news_article_view" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "news_article_view_user_last_viewed_idx" ON "news_article_view" USING btree ("user_id","last_viewed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_article_share_article_id_idx" ON "news_article_share" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "news_article_share_user_id_idx" ON "news_article_share" USING btree ("user_id");
