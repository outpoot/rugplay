CREATE TABLE IF NOT EXISTS "user_block" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker_id" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"blocked_id" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_block_unique" UNIQUE("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_block_blocker_id_idx" ON "user_block" ("blocker_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_block_blocked_id_idx" ON "user_block" ("blocked_id");
