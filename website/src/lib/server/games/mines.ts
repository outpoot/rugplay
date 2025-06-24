import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';

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
            }
            await redis.del(getSessionKey(game.sessionToken));
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

                await redis.del(getSessionKey(game.sessionToken));
            } catch (error) {
                console.error(`Failed to auto cashout game ${game.sessionToken}:`, error);
            }
        }
    }
}

const getMaxPayout = (bet: number, picks: number, mines: number): number => {
    const MAX_PAYOUT = 2_000_000;
    const HIGH_BET_THRESHOLD = 50_000;

    const mineFactor = 1 + (mines / 25);
    const baseMultiplier = (1.4 + Math.pow(picks, 0.45)) * mineFactor;

    if (bet > HIGH_BET_THRESHOLD) {
        const betRatio = Math.pow(Math.min(1, (bet - HIGH_BET_THRESHOLD) / (MAX_PAYOUT - HIGH_BET_THRESHOLD)), 1);

        // Direct cap on multiplier for high bets
        const maxAllowedMultiplier = 1.05 + (picks * 0.1);
        const highBetMultiplier = Math.min(baseMultiplier, maxAllowedMultiplier) * (1 - (bet / MAX_PAYOUT) * 0.9);
        const betSizeFactor = Math.max(0.1, 1 - (bet / MAX_PAYOUT) * 0.9);
        const minMultiplier = (1.1 + (picks * 0.15 * betSizeFactor)) * mineFactor;

        const reducedMultiplier = highBetMultiplier - ((highBetMultiplier - minMultiplier) * betRatio);
        const payout = Math.min(bet * reducedMultiplier, MAX_PAYOUT);

        return payout;
    }

    const payout = Math.min(bet * baseMultiplier, MAX_PAYOUT);
    return payout;
};

export function calculateMultiplier(picks: number, mines: number, betAmount: number): number {
    const TOTAL_TILES = 25;
    const HOUSE_EDGE = 0.05;

    // Calculate probability of winning based on picks and mines
    let probability = 1;
    for (let i = 0; i < picks; i++) {
        probability *= (TOTAL_TILES - mines - i) / (TOTAL_TILES - i);
    }

    if (probability <= 0) return 1.0;

    // Calculate fair multiplier based on probability and house edge
    const fairMultiplier = (1 / probability) * (1 - HOUSE_EDGE);

    const rawPayout = fairMultiplier * betAmount;
    const maxPayout = getMaxPayout(betAmount, picks, mines);
    const cappedPayout = Math.min(rawPayout, maxPayout);
    const effectiveMultiplier = cappedPayout / betAmount;

    return Math.max(1.0, Number(effectiveMultiplier.toFixed(2)));
}


