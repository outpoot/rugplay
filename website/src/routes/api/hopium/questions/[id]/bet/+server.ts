import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, predictionQuestion, predictionBet } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export const POST: RequestHandler = async ({ params, request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const questionId = parseInt(params.id!);
    const { side, amount } = await request.json();

    const MIN_BET = 0.01;
    const MAX_BET = 1_000_000;
    if (typeof side !== 'boolean' || typeof amount !== 'number' || !Number.isFinite(amount)) {
        return json({ error: 'Invalid bet parameters' }, { status: 400 });
    }

    // Round once to cents and use only this value from here on. Sub-cent amounts used to be
    // stored as 0.00000001 per bet while the question totals and the balance rounded back
    // to their old values, so bets were free and payouts were inflated.
    const betAmount = Math.round(amount * 100) / 100;
    if (betAmount < MIN_BET || betAmount > MAX_BET) {
        return json({ error: `Bet must be between $${MIN_BET} and $${MAX_BET.toLocaleString()}` }, { status: 400 });
    }

    const userId = Number(session.user.id);

    try {
        const result = await db.transaction(async (tx) => {
            // Check question exists and is active
            const [questionData] = await tx
                .select({
                    id: predictionQuestion.id,
                    status: predictionQuestion.status,
                    resolutionDate: predictionQuestion.resolutionDate,
                    totalYesAmount: predictionQuestion.totalYesAmount,
                    totalNoAmount: predictionQuestion.totalNoAmount,
                })
                .from(predictionQuestion)
                .where(eq(predictionQuestion.id, questionId))
                .for('update')
                .limit(1);

            if (!questionData) {
                throw new Error('Question not found');
            }

            if (questionData.status !== 'ACTIVE') {
                throw new Error('Question is not active for betting');
            }

            if (new Date() >= new Date(questionData.resolutionDate)) {
                throw new Error('Question has reached resolution date');
            }

            // Check user balance
            const [userData] = await tx
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            if (!userData || Number(userData.baseCurrencyBalance) < betAmount) {
                throw new Error('Insufficient balance');
            }

            const betAmountStr = betAmount.toFixed(2);

            // Deduct amount from user balance (numeric math in SQL, no float rounding)
            const [updatedUser] = await tx
                .update(user)
                .set({
                    baseCurrencyBalance: sql`${user.baseCurrencyBalance} - ${betAmountStr}::numeric`,
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId))
                .returning({ baseCurrencyBalance: user.baseCurrencyBalance });

            const [newBet] = await tx
                .insert(predictionBet)
                .values({
                    userId,
                    questionId,
                    side,
                    amount: betAmountStr,
                })
                .returning();

            // Update question totals
            const [updatedQuestion] = await tx
                .update(predictionQuestion)
                .set(side
                    ? { totalYesAmount: sql`${predictionQuestion.totalYesAmount} + ${betAmountStr}::numeric` }
                    : { totalNoAmount: sql`${predictionQuestion.totalNoAmount} + ${betAmountStr}::numeric` })
                .where(eq(predictionQuestion.id, questionId))
                .returning({
                    totalYesAmount: predictionQuestion.totalYesAmount,
                    totalNoAmount: predictionQuestion.totalNoAmount,
                });

            // Calculate current potential winnings for response (dynamic)
            const newTotalYes = Number(updatedQuestion.totalYesAmount);
            const newTotalNo = Number(updatedQuestion.totalNoAmount);
            const totalPool = newTotalYes + newTotalNo;
            const currentPotentialWinnings = side
                ? (totalPool / newTotalYes) * betAmount
                : (totalPool / newTotalNo) * betAmount;

            return json({
                success: true,
                bet: {
                    id: newBet.id,
                    side,
                    amount: betAmount,
                    potentialWinnings: currentPotentialWinnings,
                },
                newBalance: Number(updatedUser.baseCurrencyBalance)
            });
        });

        checkAndAwardAchievements(userId, ['hopium']);

        return result;
    } catch (e) {
        console.error('Betting error:', e);
        return json({ error: (e as Error).message }, { status: 400 });
    }
};
