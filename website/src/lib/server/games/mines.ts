import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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
}

const MINES_SESSION_PREFIX = 'mines:session:';
export const getSessionKey = (token: string) => `${MINES_SESSION_PREFIX}${token}`;

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
                    const deleted = await redis.del(getSessionKey(game.sessionToken));

                    if (!deleted) {
                        continue;
                    }

                    const [userData] = await db
                        .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                        .from(user)
                        .where(eq(user.id, game.userId))
                        .for('update')
                        .limit(1);

                    const currentBalance = Number(userData.baseCurrencyBalance);
                    const newBalance = Math.round((currentBalance + game.betAmount) * 100000000) / 100000000;

                    await db
                        .update(user)
                        .set({
                            baseCurrencyBalance: newBalance.toFixed(8),
                            updatedAt: new Date()
                        })
                        .where(eq(user.id, game.userId));
                } catch (error) {
                    console.error(`Failed to refund inactive game ${game.sessionToken}:`, error);
                }
            } else {
                await redis.del(getSessionKey(game.sessionToken));
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
                const deleted = await redis.del(getSessionKey(game.sessionToken));

                if (!deleted) {
                    continue;
                }

                const [userData] = await db
                    .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                    .from(user)
                    .where(eq(user.id, game.userId))
                    .for('update')
                    .limit(1);

                const currentBalance = Number(userData.baseCurrencyBalance);
                const payout = game.betAmount * game.currentMultiplier;
                const roundedPayout = Math.round(payout * 100000000) / 100000000;
                const newBalance = Math.round((currentBalance + roundedPayout) * 100000000) / 100000000;

                await db
                    .update(user)
                    .set({
                        baseCurrencyBalance: newBalance.toFixed(8),
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, game.userId));

            } catch (error) {
                console.error(`Failed to auto cashout game ${game.sessionToken}:`, error);
            }
        }
    }
}

export function calculateMultiplier(picks: number, mines: number, betAmount: number): number {
    return calculateMinesMultiplier(picks, mines, betAmount);
}