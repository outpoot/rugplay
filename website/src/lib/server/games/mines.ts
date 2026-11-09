import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { calculateMinesMultiplier } from '$lib/utils';

interface MinesSession {
    sessionToken: string;
    betAmount: number;
    mineCount: number;
    minePositions: number[];
    revealedTiles: number[];
    startTime: number;
    currentMultiplier: number;
    status: 'active' | 'won' | 'lost';
    lastActivity: number;
    userId: number;
    walletGeneration: number;
    version: number;
}

const MINES_SESSION_PREFIX = 'mines:session:';
export const getSessionKey = (token: string) => `${MINES_SESSION_PREFIX}${token}`;

// Claim only the board that was read. A worker must not remove a newer move.
export async function claimMinesSession(token: string, version: number | undefined) {
    return await redis.eval(`
        local current = redis.call("get", KEYS[1])
        if not current then return 0 end
        local state = cjson.decode(current)
        if (state.version or 0) ~= tonumber(ARGV[1]) then return 0 end
        return redis.call("del", KEYS[1])
    `, { keys: [getSessionKey(token)], arguments: [String(version || 0)] });
}

// --- Mines cleanup logic for scheduler ---
export async function minesCleanupInactiveGames() {
    const now = Date.now();
    const keys: string[] = [];
    let cursor = '0';
    do {
        const scanResult = await redis.scan(cursor, { MATCH: `${MINES_SESSION_PREFIX}*` });
        cursor = scanResult.cursor;
        keys.push(...scanResult.keys);
    } while (cursor !== '0');
    for (const key of keys) {
        const sessionRaw = await redis.get(key);
        if (!sessionRaw) continue;
        const game = JSON.parse(sessionRaw) as MinesSession;
        if (now - game.lastActivity > 5 * 60 * 1000) {
            if (game.revealedTiles.length === 0) {
                try {
                    const deleted = await claimMinesSession(game.sessionToken, game.version);

                    if (!deleted) {
                        continue;
                    }

                    if (!Number.isInteger(game.walletGeneration) || game.walletGeneration < 0) continue;

                    await db
                        .update(user)
                        .set({
                            baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${game.betAmount.toFixed(8)}::numeric`,
                            updatedAt: new Date()
                        })
                        .where(and(eq(user.id, game.userId), eq(user.arcadeWalletGeneration, game.walletGeneration)));
                } catch (error) {
                    console.error(`Failed to refund inactive game ${game.sessionToken}:`, error);
                }
            } else {
                await claimMinesSession(game.sessionToken, game.version);
            }
        }
    }
}

export async function minesAutoCashout() {
    const now = Date.now();
    const keys: string[] = [];
    let cursor = '0';
    do {
        const scanResult = await redis.scan(cursor, { MATCH: `${MINES_SESSION_PREFIX}*` });
        cursor = scanResult.cursor;
        keys.push(...scanResult.keys);
    } while (cursor !== '0');
    for (const key of keys) {
        const sessionRaw = await redis.get(key);
        if (!sessionRaw) continue;
        const game = JSON.parse(sessionRaw) as MinesSession;

        if (
            game.status === 'active' &&
            game.revealedTiles.length > 0 &&
            now - game.lastActivity > 20000 &&
            !game.revealedTiles.some(idx => game.minePositions.includes(idx))
        ) {
            try {
                const deleted = await claimMinesSession(game.sessionToken, game.version);

                if (!deleted) {
                    continue;
                }

                if (!Number.isInteger(game.walletGeneration) || game.walletGeneration < 0) continue;

                const roundedPayout = (game.betAmount * game.currentMultiplier).toFixed(8);

                await db
                    .update(user)
                    .set({
                        baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${roundedPayout}::numeric`,
                        updatedAt: new Date()
                    })
                    .where(and(eq(user.id, game.userId), eq(user.arcadeWalletGeneration, game.walletGeneration)));

            } catch (error) {
                console.error(`Failed to auto cashout game ${game.sessionToken}:`, error);
            }
        }
    }
}

export function calculateMultiplier(picks: number, mines: number, betAmount: number): number {
    return calculateMinesMultiplier(picks, mines, betAmount);
}
