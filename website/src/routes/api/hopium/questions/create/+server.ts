import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, predictionQuestion } from '$lib/server/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { validateQuestion } from '$lib/server/ai';
import type { RequestHandler } from './$types';

const MIN_BALANCE_REQUIRED = 100000; // $100k
const MAX_QUESTIONS_PER_HOUR = 2;
const MIN_RESOLUTION_HOURS = 1;
const MAX_RESOLUTION_DAYS = 30;

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const { question } = await request.json();

    const cleaned = (question ?? '').trim();
    if (cleaned.length < 10 || cleaned.length > 200) {
        return json({ error: 'Question must be between 10 and 200 characters' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const now = new Date();

    try {
        return await db.transaction(async (tx) => {
            // Check user balance
            const [userData] = await tx
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1);

            if (!userData || Number(userData.baseCurrencyBalance) < MIN_BALANCE_REQUIRED) {
                throw new Error(`You need at least $${MIN_BALANCE_REQUIRED.toLocaleString()} to create questions`);
            }

            // Check hourly creation limit
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const [recentQuestions] = await tx
                .select({ count: count() })
                .from(predictionQuestion)
                .where(and(
                    eq(predictionQuestion.creatorId, userId),
                    gte(predictionQuestion.createdAt, oneHourAgo)
                ));

            if (Number(recentQuestions.count) >= MAX_QUESTIONS_PER_HOUR) {
                throw new Error(`You can only create ${MAX_QUESTIONS_PER_HOUR} questions per hour`);
            }

            const validation = await validateQuestion(question);

            if (!validation.isValid) {
                throw new Error(`Question validation failed: ${validation.reason}`);
            }

            // Use AI suggested date or default fallback
            let finalResolutionDate: Date;

            if (validation.suggestedResolutionDate && !isNaN(validation.suggestedResolutionDate.getTime())) {
                finalResolutionDate = validation.suggestedResolutionDate;
            } else {
                // Fallback: 24 hours from now
                finalResolutionDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                console.warn('Using fallback resolution date (24h), AI suggested:', validation.suggestedResolutionDate);
            }

            // Validate the final date is within acceptable bounds
            const minResolutionDate = new Date(now.getTime() + MIN_RESOLUTION_HOURS * 60 * 60 * 1000);
            const maxResolutionDate = new Date(now.getTime() + MAX_RESOLUTION_DAYS * 24 * 60 * 60 * 1000);

            if (finalResolutionDate < minResolutionDate) {
                finalResolutionDate = minResolutionDate;
            } else if (finalResolutionDate > maxResolutionDate) {
                finalResolutionDate = maxResolutionDate;
            }

            // Create question
            const [newQuestion] = await tx
                .insert(predictionQuestion)
                .values({
                    creatorId: userId,
                    question: question.trim(),
                    resolutionDate: finalResolutionDate,
                    requiresWebSearch: validation.requiresWebSearch,
                    validationReason: validation.reason,
                })
                .returning();

            return json({
                success: true,
                question: {
                    id: newQuestion.id,
                    question: newQuestion.question,
                    resolutionDate: newQuestion.resolutionDate,
                    requiresWebSearch: newQuestion.requiresWebSearch
                }
            });
        });
    } catch (e) {
        console.error('Question creation error:', e);
        return json({ error: (e as Error).message }, { status: 400 });
    }
};
