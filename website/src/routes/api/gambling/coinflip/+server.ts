import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { RequestHandler } from './$types';

interface CoinflipRequest {
    side: 'heads' | 'tails';
    amount: number;
}

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { side, amount }: CoinflipRequest = await request.json();

        if (!['heads', 'tails'].includes(side)) {
            return json({ error: 'Invalid side' }, { status: 400 });
        }

        if (!amount || amount <= 0 || !Number.isFinite(amount)) {
            return json({ error: 'Invalid bet amount' }, { status: 400 });
        }

        if (amount > 1000000) {
            return json({ error: 'Bet amount too large' }, { status: 400 });
        }

        const userId = Number(session.user.id);

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);

            if (amount > currentBalance) {
                throw new Error(`Insufficient funds. You need *${amount.toFixed(2)} but only have *${currentBalance.toFixed(2)}`);
            }

            const gameResult: 'heads' | 'tails' = randomBytes(1)[0] < 128 ? 'heads' : 'tails';
            const won = gameResult === side;

            const multiplier = 2;
            const payout = won ? amount * multiplier : 0;
            const newBalance = currentBalance - amount + payout;

            await tx
                .update(user)
                .set({
                    baseCurrencyBalance: newBalance.toFixed(8),
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            return {
                won,
                result: gameResult,
                newBalance,
                payout,
                amountWagered: amount
            };
        });

        return json(result);
    } catch (e) {
        console.error('Coinflip API error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};
