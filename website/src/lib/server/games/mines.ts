import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';


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


export const activeGames = new Map<string, MinesSession>();

// Clean up old games every minute.
setInterval(async () => {
    const now = Date.now();
    for (const [token, game] of activeGames.entries()) {
        // Delete games older than 5 minutes that are still there for some reason.
        if (now - game.lastActivity > 5 * 60 * 1000) {
            // If no tiles were revealed, refund the bet
            if (game.revealedTiles.length === 0) {
                try {
                    console.log(`Processing refund for inactive Mines game ${token} (User: ${game.userId}, Bet: ${game.betAmount})`);
                    
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

                    console.log(`Successfully refunded ${game.betAmount} to user ${game.userId}. New balance: ${newBalance}`);
                } catch (error) {
                    console.error(`Failed to refund inactive game ${token}:`, error);
                }
            } else {
                console.log(`Cleaning up inactive game ${token} (User: ${game.userId}) - No refund needed as tiles were revealed`);
            }
            activeGames.delete(token);
        }
    }
}, 60000);

// Rig the game...
const getMaxPayout = (bet: number, picks: number): number => {
    const absoluteCap = 5_000_000; // never pay above this. Yeah, its rigged. Live with that :)
    const baseCap = 1.4; // 1.4x min multiplier, increase to, well, increase payouts
    const growthRate = 0.45; // cap curve sensitivity

    // Cap increases with number of successful reveals
    const effectiveMultiplierCap = baseCap + Math.pow(picks, growthRate);
    const payoutCap = bet * effectiveMultiplierCap;

    return Math.min(payoutCap, absoluteCap);
};


export function calculateMultiplier(picks: number, mines: number, betAmount: number): number {
    const TOTAL_TILES = 25;
    const HOUSE_EDGE = 0.05;

    let probability = 1;
    for (let i = 0; i < picks; i++) {
        probability *= (TOTAL_TILES - mines - i) / (TOTAL_TILES - i);
    }

    if (probability <= 0) return 1.0;

    const fairMultiplier = (1 / probability) * (1 - HOUSE_EDGE);
    const rawPayout = fairMultiplier * betAmount;

    const maxPayout = getMaxPayout(betAmount, picks);
    const cappedPayout = Math.min(rawPayout, maxPayout);
    const effectiveMultiplier = cappedPayout / betAmount;

    return Math.max(1.0, effectiveMultiplier);
}


