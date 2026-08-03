CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coin_name_trgm_idx" ON "coin" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coin_symbol_trgm_idx" ON "coin" USING gin ("symbol" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_username_trgm_idx" ON "user" USING gin ("username" gin_trgm_ops);
