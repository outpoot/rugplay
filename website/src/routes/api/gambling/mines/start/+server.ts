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
        const { betAmount, mineCount } = await request.json();
        const userId = Number(session.user.id);

        if (!betAmount || betAmount <= 0 || !mineCount || mineCount < 3 || mineCount > 24) {
            return json({ error: 'Invalid bet amount or mine count' }, { status: 400 });
        }

        if (betAmount > 1000000) {
            return json({ error: 'Bet amount too large' }, { status: 400 });
        }

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);
            const roundedAmount = Math.round(betAmount * 100000000) / 100000000;
            const roundedBalance = Math.round(currentBalance * 100000000) / 100000000;

            if (roundedAmount > roundedBalance) {
                throw new Error(`Insufficient funds. You need *${roundedAmount.toFixed(2)} but only have *${roundedBalance.toFixed(2)}`);
            }

            // Generate mine positions
            const positions = new Set<number>();
            while (positions.size < mineCount) {
                positions.add(Math.floor(Math.random() * 25));
            }

            // transaction token for authentication stuff
            const randomBytes = new Uint8Array(8);
            crypto.getRandomValues(randomBytes);
            const sessionToken = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const now = Date.now();
            const newBalance = roundedBalance - roundedAmount;

            await redis.set(
                getSessionKey(sessionToken),
                JSON.stringify({
                    sessionToken,
                    betAmount: roundedAmount,
                    mineCount,
                    minePositions: Array.from(positions),
                    revealedTiles: [],
                    startTime: now,
                    lastActivity: now,
                    currentMultiplier: 1,
                    status: 'active',
                    userId
                })
            );

            // Update user balance
            await tx
                .update(user)
                .set({
                    baseCurrencyBalance: newBalance.toFixed(8),
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            return {
                sessionToken,
                newBalance
            };
        });

        return json(result);
    } catch (e) {
        console.error('Mines start error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};