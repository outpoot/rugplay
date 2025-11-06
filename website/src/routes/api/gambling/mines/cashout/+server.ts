import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';
import { publishGamblingActivity } from '$lib/server/gambling-activity';
import type { RequestHandler } from './$types';

const MIN_BET = 0.1;
const MAX_MINES = 24;
const MAX_MULTIPLIER = 1000;

export const POST: RequestHandler = async ({ request }) => {
    return json({ error: 'Mines is currently under maintenance. Please check back later.' }, { status: 503 });

    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const { sessionToken } = await request.json();
        const userId = Number(session.user.id);

        const sessionRaw = await redis.get(getSessionKey(sessionToken));
        const game = sessionRaw ? JSON.parse(sessionRaw) : null;

        if (!game) return json({ error: 'Invalid session' }, { status: 400 });

        // Input validation
        const betAmount = Number(game.betAmount);
        if (!betAmount || betAmount < MIN_BET || !isFinite(betAmount)) {
            return json({ error: 'Invalid bet amount' }, { status: 400 });
        }

        const mineCount = Number(game.mineCount);
        if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount > MAX_MINES) {
            return json({ error: 'Invalid mine count' }, { status: 400 });
        }

        const currentMultiplier = Number(game.currentMultiplier) || 1;
        if (!isFinite(currentMultiplier) || currentMultiplier < 1 || currentMultiplier > MAX_MULTIPLIER) {
            return json({ error: 'Invalid multiplier' }, { status: 400 });
        }

        if (game.userId !== userId) {
            return json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 });
        }

        const deleted = await redis.del(getSessionKey(sessionToken));

        if (!deleted) {
            return json({ error: 'Session already processed' }, { status: 400 });
        }

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({
                    baseCurrencyBalance: user.baseCurrencyBalance,
                    gamblingLosses: user.gamblingLosses,
                    gamblingWins: user.gamblingWins
                })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);
            let payout: number;
            let newBalance: number;

            if (game.revealedTiles.length === 0) {
                payout = betAmount;
            } else {
                payout = betAmount * currentMultiplier;
            }

            // Critical Fix
            payout = Math.max(0, Math.round(payout * 1e8) / 1e8);
            newBalance = Math.round((currentBalance + payout) * 1e8) / 1e8;

            await tx
                .update(user)
                .set(updateData)
                .where(eq(user.id, userId));


            return {
                newBalance,
                payout,
                amountWagered: betAmount,
                isAbort: game.revealedTiles.length === 0,
                minePositions: game.minePositions
            };
        });

        const won = !result.isAbort && result.payout > result.amountWagered;
        await publishGamblingActivity(userId, won ? result.payout : result.amountWagered, won, 'mines', 1000);

        return json(result);
    } catch (e) {
        console.error('Mines cashout error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};
