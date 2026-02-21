import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { publishArcadeActivity } from '$lib/server/arcade-activity';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { validateBetAmount } from '$lib/utils';
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

        const roundedBet = validateBetAmount(amount);

        const userId = Number(session.user.id);

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({
                    baseCurrencyBalance: user.baseCurrencyBalance,
                    arcadeLosses: user.arcadeLosses,
                    arcadeWins: user.arcadeWins,
                    totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
                    arcadeWinStreak: user.arcadeWinStreak,
                    arcadeBestWinStreak: user.arcadeBestWinStreak,
                    totalArcadeWagered: user.totalArcadeWagered
                })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);
            const roundedBalance = Math.round(currentBalance * 100000000) / 100000000;

            if (roundedBet > roundedBalance) {
                throw new Error(`Insufficient funds. You need $${roundedBet.toFixed(2)} but only have $${roundedBalance.toFixed(2)}`);
            }

            const gameResult = randomInt(1, 7);
            const won = gameResult === selectedNumber;

            const multiplier = 3;
            const payout = won ? roundedBet * multiplier : 0;
            const newBalance = roundedBalance - roundedBet + payout;

            const netResult = payout - roundedBet;
            const isWin = netResult > 0;

            const updateData: any = {
                baseCurrencyBalance: newBalance.toFixed(8),
                updatedAt: new Date()
            };

            if (isWin) {
                updateData.arcadeWins = `${Number(userData.arcadeWins || 0) + netResult}`;
                const newWinStreak = (userData.arcadeWinStreak || 0) + 1;
                updateData.arcadeWinStreak = newWinStreak;
                updateData.arcadeBestWinStreak = Math.max(newWinStreak, userData.arcadeBestWinStreak || 0);
            } else {
                updateData.arcadeLosses = `${Number(userData.arcadeLosses || 0) + Math.abs(netResult)}`;
                updateData.arcadeWinStreak = 0;
            }
            updateData.totalArcadeGamesPlayed = (userData.totalArcadeGamesPlayed || 0) + 1;
            updateData.totalArcadeWagered = `${Number(userData.totalArcadeWagered || 0) + roundedBet}`;

            await tx
                .update(user)
                .set(updateData)
                .where(eq(user.id, userId));

            return {
                won,
                result: gameResult,
                newBalance,
                payout,
                amountWagered: roundedBet
            };
        });

        await publishArcadeActivity(userId, result.won ? result.payout : result.amountWagered, result.won, 'dice', 2000);

        await checkAndAwardAchievements(userId, ['arcade'], { arcadeWon: result.won, arcadeWager: result.amountWagered });

        return json(result);
    } catch (e) {
        console.error('Dice API error:', e);
        if (e instanceof Error && e.message.startsWith('Insufficient funds')) {
            return json({ error: e.message }, { status: 400 });
        }
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
