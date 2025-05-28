import { db } from '$lib/server/db';
import { predictionQuestion, predictionBet, user } from '$lib/server/db/schema';
import { eq, and, lte, isNull } from 'drizzle-orm';
import { resolveQuestion, getRugplayData } from '$lib/server/ai';

export async function resolveExpiredQuestions() {
    const now = new Date();

    try {
        const expiredQuestions = await db
            .select({
                id: predictionQuestion.id,
                question: predictionQuestion.question,
                requiresWebSearch: predictionQuestion.requiresWebSearch,
                totalYesAmount: predictionQuestion.totalYesAmount,
                totalNoAmount: predictionQuestion.totalNoAmount,
            })
            .from(predictionQuestion)
            .where(and(
                eq(predictionQuestion.status, 'ACTIVE'),
                lte(predictionQuestion.resolutionDate, now),
                isNull(predictionQuestion.aiResolution)
            ));

        console.log(`Found ${expiredQuestions.length} questions to resolve`);

        for (const question of expiredQuestions) {
            try {
                console.log(`Resolving question: ${question.question}`);

                const rugplayData = await getRugplayData();
                const resolution = await resolveQuestion(
                    question.question,
                    question.requiresWebSearch,
                    rugplayData
                );

                if (resolution.confidence < 50) {
                    console.log(`Skipping question ${question.id} due to low confidence: ${resolution.confidence}`);
                    continue;
                }

                await db.transaction(async (tx) => {
                    await tx
                        .update(predictionQuestion)
                        .set({
                            status: 'RESOLVED',
                            aiResolution: resolution.resolution,
                            resolvedAt: now,
                        })
                        .where(eq(predictionQuestion.id, question.id));

                    const bets = await tx
                        .select({
                            id: predictionBet.id,
                            userId: predictionBet.userId,
                            side: predictionBet.side,
                            amount: predictionBet.amount,
                        })
                        .from(predictionBet)
                        .where(and(
                            eq(predictionBet.questionId, question.id),
                            isNull(predictionBet.settledAt)
                        ));

                    const totalPool = Number(question.totalYesAmount) + Number(question.totalNoAmount);
                    const winningSideTotal = resolution.resolution
                        ? Number(question.totalYesAmount)
                        : Number(question.totalNoAmount);

                    for (const bet of bets) {
                        const won = bet.side === resolution.resolution;

                        const winnings = won && winningSideTotal > 0
                            ? (totalPool / winningSideTotal) * Number(bet.amount)
                            : 0;

                        await tx
                            .update(predictionBet)
                            .set({
                                actualWinnings: winnings.toFixed(8),
                                settledAt: now,
                            })
                            .where(eq(predictionBet.id, bet.id));

                        if (won && winnings > 0) {
                            const [userData] = await tx
                                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                                .from(user)
                                .where(eq(user.id, bet.userId))
                                .limit(1);

                            if (userData) {
                                const newBalance = Number(userData.baseCurrencyBalance) + winnings;
                                await tx
                                    .update(user)
                                    .set({
                                        baseCurrencyBalance: newBalance.toFixed(8),
                                        updatedAt: now,
                                    })
                                    .where(eq(user.id, bet.userId));
                            }
                        }
                    }
                });

                console.log(`Successfully resolved question ${question.id}: ${resolution.resolution ? 'YES' : 'NO'} (confidence: ${resolution.confidence}%)`);
            } catch (error) {
                console.error(`Failed to resolve question ${question.id}:`, error);
            }
        }

    } catch (error) {
        console.error('Error in resolveExpiredQuestions:', error);
    }
}