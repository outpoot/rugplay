CREATE INDEX IF NOT EXISTS "transaction_user_id_timestamp_idx" ON "transaction" USING btree ("user_id","timestamp");
