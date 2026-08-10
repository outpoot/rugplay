CREATE TABLE "news_article_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"article_id" integer NOT NULL,
	"content" varchar(500) NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_article_comment_like" (
	"user_id" integer NOT NULL,
	"comment_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_comment_like_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id")
);
--> statement-breakpoint
CREATE TABLE "news_article_reaction_emoji" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"emoji" varchar(16) NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_reaction_emoji_article_emoji_unique" UNIQUE("article_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "news_article_reaction_user" (
	"user_id" integer NOT NULL,
	"reaction_emoji_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_reaction_user_user_id_reaction_emoji_id_pk" PRIMARY KEY("user_id","reaction_emoji_id")
);
--> statement-breakpoint
ALTER TABLE "news_article_comment" ADD CONSTRAINT "news_article_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_comment" ADD CONSTRAINT "news_article_comment_article_id_news_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_article"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_comment_like" ADD CONSTRAINT "news_article_comment_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_comment_like" ADD CONSTRAINT "news_article_comment_like_comment_id_news_article_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."news_article_comment"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_reaction_emoji" ADD CONSTRAINT "news_article_reaction_emoji_article_id_news_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_article"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_reaction_emoji" ADD CONSTRAINT "news_article_reaction_emoji_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_reaction_user" ADD CONSTRAINT "news_article_reaction_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "news_article_reaction_user" ADD CONSTRAINT "news_article_reaction_user_reaction_emoji_id_news_article_reaction_emoji_id_fk" FOREIGN KEY ("reaction_emoji_id") REFERENCES "public"."news_article_reaction_emoji"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "news_article_comment_user_id_idx" ON "news_article_comment" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "news_article_comment_article_id_idx" ON "news_article_comment" USING btree ("article_id");
--> statement-breakpoint
CREATE INDEX "news_article_reaction_emoji_article_id_idx" ON "news_article_reaction_emoji" USING btree ("article_id");
--> statement-breakpoint
CREATE INDEX "news_article_reaction_user_emoji_id_idx" ON "news_article_reaction_user" USING btree ("reaction_emoji_id");
