-- ============================================================
-- Migration: Fix prestige cascade bug + new features
-- ============================================================

-- FIX 1: prestige_level should never be NULL — coerce existing NULLs
UPDATE "user" SET prestige_level = 0 WHERE prestige_level IS NULL;
ALTER TABLE "user" ALTER COLUMN prestige_level SET DEFAULT 0;
ALTER TABLE "user" ALTER COLUMN prestige_level SET NOT NULL;

-- FIX 2: The prestige POST handler called tx.delete(userPortfolio) TWICE.
-- The second call (after the loop) is a no-op but the first loop also
-- left orphaned portfolio rows when executeSellTrade failed silently.
-- We clean up any leftover zero-quantity rows right now:
DELETE FROM user_portfolio WHERE CAST(quantity AS NUMERIC) <= 0;

-- FEATURE: Watchlist — users can star coins
CREATE TABLE IF NOT EXISTS "watchlist" (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    coin_id     INTEGER NOT NULL REFERENCES "coin"(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT watchlist_unique UNIQUE (user_id, coin_id)
);

CREATE INDEX IF NOT EXISTS watchlist_user_id_idx  ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS watchlist_coin_id_idx  ON watchlist(coin_id);

-- FEATURE: Portfolio snapshots for P&L history chart
-- Taken once per hour by the background job
CREATE TABLE IF NOT EXISTS "portfolio_snapshot" (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    total_value     NUMERIC(30, 8) NOT NULL,
    cash_balance    NUMERIC(30, 8) NOT NULL,
    holdings_value  NUMERIC(30, 8) NOT NULL,
    snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_snapshot_user_id_idx        ON portfolio_snapshot(user_id);
CREATE INDEX IF NOT EXISTS portfolio_snapshot_snapshotted_at_idx ON portfolio_snapshot(snapshotted_at);
CREATE INDEX IF NOT EXISTS portfolio_snapshot_user_time_idx      ON portfolio_snapshot(user_id, snapshotted_at DESC);

-- FEATURE: Coin-level chat (separate from comments — no coin context required)
-- Re-uses existing comment table but adds a chat_room concept via a type flag.
-- We add a simple "is_chat" boolean so the existing comment API stays untouched.
ALTER TABLE "comment" ADD COLUMN IF NOT EXISTS is_chat BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS comment_is_chat_idx ON comment(is_chat);
