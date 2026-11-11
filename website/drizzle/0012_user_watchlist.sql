CREATE TABLE "user_watchlist" (
	"user_id" integer NOT NULL,
	"coin_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_watchlist_user_id_coin_id_pk" PRIMARY KEY("user_id","coin_id")
);
--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_coin_id_coin_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coin"("id") ON DELETE cascade ON UPDATE no action;