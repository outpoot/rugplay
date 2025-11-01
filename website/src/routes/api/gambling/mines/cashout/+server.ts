import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';
import { publishGamblingActivity } from '$lib/server/gambling-activity';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    throw error(503, 'Service temporarily unavailable');

    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { sessionToken } = await request.json();
        const sessionRaw = await redis.get(getSessionKey(sessionToken));
        const game = sessionRaw ? JSON.parse(sessionRaw) : null;
        const userId = Number(session.user.id);

        if (!game) {
            return json({ error: 'Invalid session' }, { status: 400 });
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

            // If no tiles revealed, treat as abort and return full bet.
            if (game.revealedTiles.length === 0) {
                payout = game.betAmount;
                newBalance = Math.round((currentBalance + payout) * 100000000) / 100000000;
            } else {
                payout = game.betAmount * game.currentMultiplier;
                const roundedPayout = Math.round(payout * 100000000) / 100000000;
                newBalance = Math.round((currentBalance + roundedPayout) * 100000000) / 100000000;
            }

            // Calculate gambling stats
            const netResult = payout - game.betAmount;
            const isWin = netResult > 0;

            const updateData: any = {
                baseCurrencyBalance: newBalance.toFixed(8),
                updatedAt: new Date()
            };

            if (isWin) {
                updateData.gamblingWins = `${Number(userData.gamblingWins || 0) + netResult}`;
            } else if (netResult < 0) {
                updateData.gamblingLosses = `${Number(userData.gamblingLosses || 0) + Math.abs(netResult)}`;
            }

            await tx
                .update(user)
                .set(updateData)
                .where(eq(user.id, userId));

            await redis.del(getSessionKey(sessionToken));

            return {
                newBalance,
                payout,
                amountWagered: game.betAmount,
                isAbort: game.revealedTiles.length === 0,
                minePositions: game.minePositions
            };
        });

        await publishGamblingActivity(userId, result.amountWagered, !result.isAbort && result.payout > result.amountWagered, 'mines', 1000);

        return json(result);
    } catch (e) {
        console.error('Mines cashout error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};