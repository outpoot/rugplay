import { db } from '$lib/server/db';
import { predictionQuestion, predictionBet, user, accountDeletionRequest, session, account, promoCodeRedemption, userPortfolio, commentLike, comment, transaction, coin } from '$lib/server/db/schema';
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

                        if (won && winnings > 0 && bet.userId !== null) {
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

export async function processAccountDeletions() {
    const now = new Date();

    try {
        const expiredRequests = await db.select()
            .from(accountDeletionRequest)
            .where(
                and(
                    lte(accountDeletionRequest.scheduledDeletionAt, now),
                    eq(accountDeletionRequest.isProcessed, false)
                )
            );

        console.log(`🗑️ Processing ${expiredRequests.length} expired account deletion requests`);

        for (const request of expiredRequests) {
            try {
                await db.transaction(async (tx) => {
                    const userId = request.userId;

                    await tx.update(transaction)
                        .set({ userId: null })
                        .where(eq(transaction.userId, userId));

                    await tx.update(comment)
                        .set({ userId: null, content: "[deleted]", isDeleted: true })
                        .where(eq(comment.userId, userId));

                    await tx.update(predictionBet)
                        .set({ userId: null })
                        .where(eq(predictionBet.userId, userId));

                    await tx.update(predictionQuestion)
                        .set({ creatorId: null })
                        .where(eq(predictionQuestion.creatorId, userId));

                    await tx.update(coin)
                        .set({ creatorId: null })
                        .where(eq(coin.creatorId, userId));

                    await tx.delete(session).where(eq(session.userId, userId));
                    await tx.delete(account).where(eq(account.userId, userId));
                    await tx.delete(promoCodeRedemption).where(eq(promoCodeRedemption.userId, userId));
                    await tx.delete(userPortfolio).where(eq(userPortfolio.userId, userId));
                    await tx.delete(commentLike).where(eq(commentLike.userId, userId));

                    await tx.update(accountDeletionRequest)
                        .set({ isProcessed: true })
                        .where(eq(accountDeletionRequest.id, request.id));

                    await tx.delete(user).where(eq(user.id, userId));
                });

                console.log(`✅ Successfully processed account deletion for user ID: ${request.userId}`);
            } catch (error: any) {
                console.error(`❌ Failed to process account deletion for user ID: ${request.userId}`, error);

                await db.update(accountDeletionRequest)
                    .set({
                        isProcessed: true, // Mark as processed to avoid retries, but log the failure
                        reason: request.reason ? `${request.reason} - FAILED: ${error.message}` : `FAILED: ${error.message}`
                    })
                    .where(eq(accountDeletionRequest.id, request.id));
            }
        }
    } catch (error) {
        console.error('Error processing account deletions:', error);
    }
}