import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { calculateMultiplier } from '$lib/server/games/mines';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis, } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';

export const POST: RequestHandler = async ({ request }) => {
    throw error(503, 'Service temporarily unavailable');

    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { sessionToken, tileIndex } = await request.json();

        if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex > 24) {
            return json({ error: 'Invalid tileIndex' }, { status: 400 });
        }

        const sessionRaw = await redis.get(getSessionKey(sessionToken));
        const game = sessionRaw ? JSON.parse(sessionRaw) : null;

        if (!game) {
            return json({ error: 'Invalid session' }, { status: 400 });
        }

        if (game.revealedTiles.includes(tileIndex)) {
            return json({ error: 'Tile already revealed' }, { status: 400 });
        }

        game.lastActivity = Date.now();

        if (game.minePositions.includes(tileIndex)) {
            game.status = 'lost';
            const minePositions = game.minePositions;

            const userId = Number(session.user.id);
            const [userData] = await db
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);

            await db
                .update(user)
                .set({
                    baseCurrencyBalance: currentBalance.toFixed(8),
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            await redis.del(getSessionKey(sessionToken));

            return json({
                hitMine: true,
                minePositions,
                newBalance: currentBalance,
                status: 'lost',
                amountWagered: game.betAmount
            });
        }

        // Safe tile
        game.revealedTiles.push(tileIndex);
        game.currentMultiplier = calculateMultiplier(
            game.revealedTiles.length,
            game.mineCount,
            game.betAmount
        );

        if (game.revealedTiles.length === 25 - game.mineCount) {
            game.status = 'won';
            const userId = Number(session.user.id);
            const [userData] = await db
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
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
                .where(eq(user.id, userId));

            await redis.del(getSessionKey(sessionToken));

            return json({
                hitMine: false,
                currentMultiplier: game.currentMultiplier,
                status: 'won',
                newBalance,
                payout
            });
        }

        await redis.set(getSessionKey(sessionToken), JSON.stringify(game));

        return json({
            hitMine: false,
            currentMultiplier: game.currentMultiplier,
            status: game.status
        });
    } catch (e) {
        console.error('Mines reveal error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};