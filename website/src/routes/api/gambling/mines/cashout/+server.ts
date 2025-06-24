import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
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
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
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

            await tx
                .update(user)
                .set({
                    baseCurrencyBalance: newBalance.toFixed(8),
                    updatedAt: new Date()
                })
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

        return json(result);
    } catch (e) {
        console.error('Mines cashout error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};