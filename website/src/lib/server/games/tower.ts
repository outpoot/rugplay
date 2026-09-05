import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import type { TowerDifficulty } from '$lib/utils';

export interface TowerSession {
    sessionToken: string;
    betAmount: number;
    difficulty: TowerDifficulty;
    floorBombPositions: number[][];
    currentFloor: number;
    currentMultiplier: number;
    status: 'active' | 'won' | 'lost';
    startTime: number;
    lastActivity: number;
    userId: number;
    version: number;
}

export const twr_floors = 10;

const twr_prefix = 'tower:session:';
export const getSessionKey = (token: string) => `${twr_prefix}${token}`;

export async function towerCleanupInactiveGames() {
    const now = Date.now();
    const keys: string[] = [];
    let cursor = '0';
    do {
        const scanResult = await redis.scan(cursor, { MATCH: `${twr_prefix}*` });
        cursor = scanResult.cursor;
        keys.push(...scanResult.keys);
    } while (cursor !== '0');

    for (const key of keys) {
        const sessionRaw = await redis.get(key);
        if (!sessionRaw) continue;
        const game = JSON.parse(sessionRaw) as TowerSession;

        if (now - game.lastActivity > 5 * 60 * 1000) {
            if (game.currentFloor === 0) {
                try {
                    const deleted = await redis.del(getSessionKey(game.sessionToken));
                    if (!deleted) continue;

                    await db
                        .update(user)
                        .set({ baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${game.betAmount.toFixed(8)}::numeric`, updatedAt: new Date() })
                        .where(eq(user.id, game.userId));
                } catch (error) {
                    console.error(`Failed to refund inactive tower game ${game.sessionToken}:`, error);
                }
            } else {
                try {
                    await redis.del(getSessionKey(game.sessionToken));
                } catch (error) {
                    console.error(`Failed to delete abandoned tower game ${game.sessionToken}:`, error);
                }
            }
        }
    }
}