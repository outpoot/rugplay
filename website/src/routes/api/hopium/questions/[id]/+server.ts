import { auth } from '$lib/auth';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { predictionQuestion, user, predictionBet } from '$lib/server/db/schema';
import { eq, desc, sum, and, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { timeToLocal } from '$lib/utils';

export const GET: RequestHandler = async ({ params, request }) => {
	const questionId = parseInt(params.id!);
	if (isNaN(questionId)) {
		throw error(400, 'Invalid question ID');
	}

	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user ? Number(session.user.id) : null;

	try {
		// Fetch question with creator info
		const [questionData] = await db
			.select({
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
				creatorImage: user.image
			})
			.from(predictionQuestion)
			.leftJoin(user, eq(predictionQuestion.creatorId, user.id))
			.where(eq(predictionQuestion.id, questionId))
			.limit(1);

		if (!questionData) {
			throw error(404, 'Question not found');
		}

		const totalAmount = Number(questionData.totalYesAmount) + Number(questionData.totalNoAmount);
		const yesPercentage =
			totalAmount > 0 ? (Number(questionData.totalYesAmount) / totalAmount) * 100 : 50;
		const noPercentage =
			totalAmount > 0 ? (Number(questionData.totalNoAmount) / totalAmount) * 100 : 50;

		// Fetch recent bets (last 10)
		const recentBets = await db
			.select({
				id: predictionBet.id,
				side: predictionBet.side,
				amount: predictionBet.amount,
				createdAt: predictionBet.createdAt,
				userId: predictionBet.userId,
				userName: user.name,
				userUsername: user.username,
				userImage: user.image
			})
			.from(predictionBet)
			.leftJoin(user, eq(predictionBet.userId, user.id))
			.where(eq(predictionBet.questionId, questionId))
			.orderBy(desc(predictionBet.createdAt))
			.limit(10);

		// Fetch probability history for the chart
		const probabilityHistory = await db
			.select({
				createdAt: predictionBet.createdAt,
				side: predictionBet.side,
				amount: predictionBet.amount
			})
			.from(predictionBet)
			.where(eq(predictionBet.questionId, questionId))
			.orderBy(asc(predictionBet.createdAt));

		// Calculate probability over time
		let runningYesTotal = 0;
		let runningNoTotal = 0;
		const probabilityData: Array<{ time: number; value: number }> = [];

		// Add initial point at 50%
		if (probabilityHistory.length > 0) {
			const firstBetTime = Math.floor(new Date(probabilityHistory[0].createdAt).getTime() / 1000);
			probabilityData.push({
				time: timeToLocal(firstBetTime - 3600),
				value: 50
			});
		}

		for (const bet of probabilityHistory) {
			if (bet.side) {
				runningYesTotal += Number(bet.amount);
			} else {
				runningNoTotal += Number(bet.amount);
			}

			const total = runningYesTotal + runningNoTotal;
			const yesPercentage = total > 0 ? (runningYesTotal / total) * 100 : 50;

			probabilityData.push({
				time: timeToLocal(Math.floor(new Date(bet.createdAt).getTime() / 1000)),
				value: Number(yesPercentage.toFixed(1))
			});
		}

		// Add current point if no recent bets
		if (probabilityData.length > 0) {
			const lastPoint = probabilityData[probabilityData.length - 1];
			const currentTime = timeToLocal(Math.floor(Date.now() / 1000));

			// Only add current point if last bet was more than 1 hour ago
			if (currentTime - lastPoint.time > 3600) {
				probabilityData.push({
					time: currentTime,
					value: Number(yesPercentage.toFixed(1))
				});
			}
		}

		let userBets = null;
		if (userId) {
			// Fetch user's betting data
			const userBetData = await db
				.select({
					side: predictionBet.side,
					totalAmount: sum(predictionBet.amount)
				})
				.from(predictionBet)
				.where(and(eq(predictionBet.questionId, questionId), eq(predictionBet.userId, userId)))
				.groupBy(predictionBet.side);

			const yesAmount = userBetData.find((bet) => bet.side === true)?.totalAmount || 0;
			const noAmount = userBetData.find((bet) => bet.side === false)?.totalAmount || 0;
			const userTotalAmount = Number(yesAmount) + Number(noAmount);

			if (userTotalAmount > 0) {
				// Calculate estimated winnings
				const estimatedYesWinnings =
					Number(yesAmount) > 0
						? (totalAmount / Number(questionData.totalYesAmount)) * Number(yesAmount)
						: 0;
				const estimatedNoWinnings =
					Number(noAmount) > 0
						? (totalAmount / Number(questionData.totalNoAmount)) * Number(noAmount)
						: 0;

				userBets = {
					yesAmount: Number(yesAmount),
					noAmount: Number(noAmount),
					totalAmount: userTotalAmount,
					estimatedYesWinnings,
					estimatedNoWinnings
				};
			}
		}

		const formattedQuestion = {
			id: questionData.id,
			question: questionData.question,
			status: questionData.status,
			resolutionDate: questionData.resolutionDate,
			totalAmount,
			yesAmount: Number(questionData.totalYesAmount),
			noAmount: Number(questionData.totalNoAmount),
			yesPercentage,
			noPercentage,
			createdAt: questionData.createdAt,
			resolvedAt: questionData.resolvedAt,
			requiresWebSearch: questionData.requiresWebSearch,
			aiResolution: questionData.aiResolution,
			creator: {
				id: questionData.creatorId,
				name: questionData.creatorName,
				username: questionData.creatorUsername,
				image: questionData.creatorImage
			},
			userBets,
			recentBets: recentBets.map((bet) => ({
				id: bet.id,
				side: bet.side,
				amount: Number(bet.amount),
				createdAt: bet.createdAt,
				user: {
					id: bet.userId,
					name: bet.userName,
					username: bet.userUsername,
					image: bet.userImage
				}
			}))
		};

		return json({
			question: formattedQuestion,
			probabilityHistory: probabilityData
		});
	} catch (e) {
		console.error('Error fetching question:', e);
		if (e instanceof Error && e.message.includes('404')) {
			throw error(404, 'Question not found');
		}
		return json({ error: 'Failed to fetch question' }, { status: 500 });
	}
};
