import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { publishHalloweenEventUpdate } from '$lib/server/halloween-event';
import type { RequestHandler } from './$types';

function getRandomSymbol(symbols: string[]): string {
    const randomValue = randomBytes(1)[0];
    const index = Math.floor((randomValue / 256) * symbols.length);
    return symbols[index];
}

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { amount } = await request.json();

        if (!amount || amount <= 0 || !Number.isFinite(amount)) {
            return json({ error: 'Invalid bet amount' }, { status: 400 });
        }

        if (amount > 1000000) {
            return json({ error: 'Bet amount too large' }, { status: 400 });
        }

        const userId = Number(session.user.id);
        const symbols = ['bussin', 'lyntr', 'subterfuge', 'twoblade', 'wattesigma', 'webx'];

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

            // Generate random symbols
            const gameResult = [
                getRandomSymbol(symbols),
                getRandomSymbol(symbols),
                getRandomSymbol(symbols)
            ];

            let multiplier = 0;
            let winType = '';

            if (gameResult[0] === gameResult[1] && gameResult[1] === gameResult[2]) {
                multiplier = 5;
                winType = '3 OF A KIND';
            }

            else if (gameResult[0] === gameResult[1] || gameResult[1] === gameResult[2] || gameResult[0] === gameResult[2]) {
                multiplier = 2;
                winType = '2 OF A KIND';
            }

            const won = multiplier > 0;
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
                symbols: gameResult,
                newBalance,
                payout,
                amountWagered: roundedAmount,
                winType: won ? winType : undefined
            };
        });

        await publishHalloweenEventUpdate(userId, result.amountWagered, result.won, 'slots');

        return json(result);
    } catch (e) {
        console.error('Slots API error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
};
