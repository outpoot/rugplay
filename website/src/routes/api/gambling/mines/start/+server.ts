import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';
import type { RequestHandler } from './$types';

const MIN_BET = 0.1;
const MAX_BET = 1000000;
const MIN_MINES = 3;
const MAX_MINES = 24;

export const POST: RequestHandler = async ({ request }) => {
    return json({ error: 'Mines is currently under maintenance. Please check back later.' }, { status: 503 });

    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const { betAmount: rawBet, mineCount: rawMines } = await request.json();
        const userId = Number(session.user.id);

        const betAmount = Number(rawBet);
        const mineCount = Number(rawMines);

        // Validate bet and mines
        if (!isFinite(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
            return json({ error: 'Invalid bet amount' }, { status: 400 });
        }
        if (!Number.isInteger(mineCount) || mineCount < MIN_MINES || mineCount > MAX_MINES) {
            return json({ error: 'Invalid mine count' }, { status: 400 });
        }

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);
            if (betAmount > currentBalance) {
                throw new Error(`Insufficient funds. You have ${currentBalance.toFixed(8)} but tried to bet ${betAmount.toFixed(8)}`);
            }

            // Generate mine positions
            const positions = new Set<number>();
            while (positions.size < mineCount) {
                positions.add(Math.floor(Math.random() * 25));
            }

            // Generate secure session token
            const randomBytes = new Uint8Array(8);
            crypto.getRandomValues(randomBytes);
            const sessionToken = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const now = Date.now();
            const newBalance = Math.round((currentBalance - betAmount) * 1e8) / 1e8;

            await redis.set(
                getSessionKey(sessionToken),
                JSON.stringify({
                    sessionToken,
                    betAmount,
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
