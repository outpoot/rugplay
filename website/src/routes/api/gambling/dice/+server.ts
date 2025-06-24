import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { RequestHandler } from './$types';

interface DiceRequest {
    selectedNumber: number;
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
        const { selectedNumber, amount }: DiceRequest = await request.json();

        if (!selectedNumber || selectedNumber < 1 || selectedNumber > 6 || !Number.isInteger(selectedNumber)) {
            return json({ error: 'Invalid number selection' }, { status: 400 });
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

            const roundedAmount = Math.round(amount * 100000000) / 100000000;
            const roundedBalance = Math.round(currentBalance * 100000000) / 100000000;

            if (roundedAmount > roundedBalance) {
                throw new Error(`Insufficient funds. You need *${roundedAmount.toFixed(2)} but only have *${roundedBalance.toFixed(2)}`);
            }

            const gameResult = Math.floor(randomBytes(1)[0] / 42.67) + 1; // This gives us a number between 1-6
            const won = gameResult === selectedNumber;

            const multiplier = 3;
            const payout = won ? roundedAmount * multiplier : 0;
            const newBalance = roundedBalance - roundedAmount + payout;

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
                amountWagered: roundedAmount
            };
        });

        return json(result);
    } catch (e) {
        console.error('Dice API error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};
