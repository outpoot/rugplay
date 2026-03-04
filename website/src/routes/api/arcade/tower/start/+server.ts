import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey, twr_floors } from '$lib/server/games/tower';
import { validateBetAmount, twr_difficulty_config, type TowerDifficulty } from '$lib/utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const { betAmount, difficulty } = await request.json();
        const userId = Number(session.user.id);

        if (!difficulty || !Object.keys(twr_difficulty_config).includes(difficulty)) {
            return json({ error: 'Invalid difficulty' }, { status: 400 });
        }

        const config = twr_difficulty_config[difficulty as TowerDifficulty];
        const bet = validateBetAmount(betAmount, 0.01, config.maxBet);

        const floorBombs: number[][] = [];
        for (let i = 0; i < twr_floors; i++) {
            const bombs = new Set<number>();
            while (bombs.size < config.bombs) {
                bombs.add(Math.floor(Math.random() * config.tiles));
            }
            floorBombs.push(Array.from(bombs));
        }

        const result = await db.transaction(async (tx) => {
            const [row] = await tx
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const balance = Math.round(Number(row.baseCurrencyBalance) * 100000000) / 100000000;

            if (bet > balance) {
                throw new Error(`Insufficient funds. You need $${bet.toFixed(2)} but only have $${balance.toFixed(2)}`);
            }

            const bytes = new Uint8Array(8);
            crypto.getRandomValues(bytes);
            const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

            const now = Date.now();
            const newBalance = balance - bet;

            await redis.set(
                getSessionKey(token),
                JSON.stringify({
                    sessionToken: token,
                    betAmount: bet,
                    difficulty,
                    floorBombPositions: floorBombs,
                    currentFloor: 0,
                    currentMultiplier: 1,
                    status: 'active',
                    startTime: now,
                    lastActivity: now,
                    userId,
                    version: 0
                })
            );

            await tx
                .update(user)
                .set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() })
                .where(eq(user.id, userId));

            return { sessionToken: token, newBalance };
        });

        return json(result);
    } catch (e) {
        if (e instanceof Error && e.message.startsWith('Insufficient funds')) {
            return json({ error: e.message }, { status: 400 });
        }
        console.error('Tower start error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};