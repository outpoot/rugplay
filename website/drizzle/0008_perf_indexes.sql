DROP INDEX IF EXISTS "coin_symbol_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notification_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "transaction_coin_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apikey_key" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_id_created_at_idx" ON "notification" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_unread_idx" ON "notification" USING btree ("user_id") WHERE is_read = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_history_coin_id_timestamp_idx" ON "price_history" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transaction_coin_id_timestamp_idx" ON "transaction" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_portfolio_coin_id_quantity_idx" ON "user_portfolio" USING btree ("coin_id","quantity" DESC NULLS LAST);
