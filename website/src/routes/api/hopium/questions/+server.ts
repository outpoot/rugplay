import { auth } from '$lib/auth';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { predictionQuestion, user, predictionBet } from '$lib/server/db/schema';
import { eq, desc, and, sum, count, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
    const statusParam = url.searchParams.get('status') || 'ACTIVE';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const validStatuses = ['ACTIVE', 'RESOLVED', 'CANCELLED', 'ALL'];
    if (!validStatuses.includes(statusParam)) {
        return json({ error: 'Invalid status parameter. Must be one of: ACTIVE, RESOLVED, CANCELLED, ALL' }, { status: 400 });
    }
    const status = statusParam;

    if (Number.isNaN(page) || page < 1 || Number.isNaN(limit) || limit < 1 || limit > 100) {
        return json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user ? Number(session.user.id) : null;

    try {
        let statusFilter;

        if (status === 'ACTIVE') {
            statusFilter = eq(predictionQuestion.status, 'ACTIVE');
        } else if (status === 'RESOLVED') {
            statusFilter = or(
                eq(predictionQuestion.status, 'RESOLVED'),
                eq(predictionQuestion.status, 'CANCELLED')
            );
        } else {
            statusFilter = undefined;
        }

        const conditions = [];
        if (statusFilter) {
            conditions.push(statusFilter);
        }

        const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

        const [[{ total }], questions] = await Promise.all([
            db.select({ total: count() }).from(predictionQuestion).where(whereCondition),
            db.select({
                id: predictionQuestion.id,
                question: predictionQuestion.question,
                status: predictionQuestion.status,
                resolutionDate: predictionQuestion.resolutionDate,
                totalYesAmount: predictionQuestion.totalYesAmount,
                totalNoAmount: predictionQuestion.totalNoAmount,
                createdAt: predictionQuestion.createdAt,
                resolvedAt: predictionQuestion.resolvedAt,
                requiresWebSearch: predictionQuestion.requiresWebSearch,
                aiResolution: predictionQuestion.aiResolution,
                creatorId: predictionQuestion.creatorId,
                creatorName: user.name,
                creatorUsername: user.username,
                creatorImage: user.image,
            })
                .from(predictionQuestion)
                .leftJoin(user, eq(predictionQuestion.creatorId, user.id))
                .where(whereCondition)
                .orderBy(desc(predictionQuestion.createdAt))
                .limit(limit)
                .offset((page - 1) * limit)
        ]);

        let userBetsMap = new Map();
        if (userId && questions.length > 0) {
            const questionIds = questions.map(q => q.id);
            const userBets = await db
                .select({
                    questionId: predictionBet.questionId,
                    side: predictionBet.side,
                    totalAmount: sum(predictionBet.amount),
                })
                .from(predictionBet)
                .where(and(
                    eq(predictionBet.userId, userId),
                ))
                .groupBy(predictionBet.questionId, predictionBet.side);

            userBets
                .filter(bet => questionIds.includes(bet.questionId))
                .forEach(bet => {
                    if (!userBetsMap.has(bet.questionId)) {
                        userBetsMap.set(bet.questionId, { yesAmount: 0, noAmount: 0 });
                    }
                    const bets = userBetsMap.get(bet.questionId);
                    if (bet.side) {
                        bets.yesAmount = Number(bet.totalAmount);
                    } else {
                        bets.noAmount = Number(bet.totalAmount);
                    }
                });
        }

        const formattedQuestions = questions.map(q => {
            const totalAmount = Number(q.totalYesAmount) + Number(q.totalNoAmount);
            const yesPercentage = totalAmount > 0 ? (Number(q.totalYesAmount) / totalAmount) * 100 : 50;
            const noPercentage = totalAmount > 0 ? (Number(q.totalNoAmount) / totalAmount) * 100 : 50;

            const userBets = userBetsMap.get(q.id) || null;

            return {
                id: q.id,
                question: q.question,
                status: q.status,
                resolutionDate: q.resolutionDate,
                totalAmount,
                yesAmount: Number(q.totalYesAmount),
                noAmount: Number(q.totalNoAmount),
                yesPercentage,
                noPercentage,
                createdAt: q.createdAt,
                resolvedAt: q.resolvedAt,
                requiresWebSearch: q.requiresWebSearch,
                aiResolution: q.aiResolution,
                creator: {
                    id: q.creatorId,
                    name: q.creatorName,
                    username: q.creatorUsername,
                    image: q.creatorImage,
                },
                userBets
            };
        });

        const totalCount = Number(total) || 0;

        return json({
            questions: formattedQuestions,
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (e) {
        console.error('Error fetching questions:', e);
        return json({ error: 'Failed to fetch questions' }, { status: 500 });
    }
};
