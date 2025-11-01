import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { publishGamblingActivity } from '$lib/server/gambling-activity';
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

            const roundedAmount = Math.round(amount * 100000000) / 100000000;
            const roundedBalance = Math.round(currentBalance * 100000000) / 100000000;

            if (roundedAmount > roundedBalance) {
                throw new Error(`Insufficient funds. You need *${roundedAmount.toFixed(2)} but only have *${roundedBalance.toFixed(2)}`);
            }

            const gameResult: 'heads' | 'tails' = randomBytes(1)[0] < 128 ? 'heads' : 'tails';
            const won = gameResult === side;

            const multiplier = 2;
            const payout = won ? roundedAmount * multiplier : 0;
            const newBalance = roundedBalance - roundedAmount + payout;

            // Calculate gambling stats
            const netResult = payout - roundedAmount;
            const isWin = netResult > 0;

            const updateData: any = {
                baseCurrencyBalance: newBalance.toFixed(8),
                updatedAt: new Date()
            };

            if (isWin) {
                updateData.gamblingWins = `${Number(userData.gamblingWins || 0) + netResult}`;
            } else {
                updateData.gamblingLosses = `${Number(userData.gamblingLosses || 0) + Math.abs(netResult)}`;
            }

            await tx
                .update(user)
                .set(updateData)
                .where(eq(user.id, userId));

            return {
                won,
                result: gameResult,
                newBalance,
                payout,
                amountWagered: roundedAmount
            };
        });

        await publishGamblingActivity(userId, result.won ? result.payout : result.amountWagered, result.won, 'coinflip', 2500);

        return json(result);
    } catch (e) {
        console.error('Coinflip API error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};
