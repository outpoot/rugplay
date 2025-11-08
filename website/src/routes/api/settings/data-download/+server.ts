import { auth } from '$lib/auth';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	user,
	transaction,
	coin,
	userPortfolio,
	predictionBet,
	predictionQuestion,
	comment,
	commentLike,
	promoCodeRedemption,
	promoCode,
	session
} from '$lib/server/db/schema';
import { eq, and, lte } from 'drizzle-orm';

export async function HEAD({ request }) {
	const authSession = await auth.api.getSession({
		headers: request.headers
	});

	if (!authSession?.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = Number(authSession.user.id);

	try {
		// Quick check to estimate file size without generating full data
		// Get counts of major data types to estimate size
		const userExists = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (!userExists.length) {
			throw error(404, 'User not found');
		}

		// Estimate file size based on typical data sizes
		// This is a rough estimate - actual size may vary
		const estimatedSize = 1024 * 50; // Base 50KB estimate

		return new Response(null, {
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="rugplay-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
				'Content-Length': estimatedSize.toString(),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0'
			}
		});
	} catch (err) {
		console.error('Data export HEAD error:', err);
		throw error(500, 'Failed to check export availability');
	}
}

export async function GET({ request }) {
	const authSession = await auth.api.getSession({
		headers: request.headers
	});

	if (!authSession?.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = Number(authSession.user.id);

	try {
		// Get user data
		const userData = await db.select().from(user).where(eq(user.id, userId)).limit(1);

		if (!userData.length) {
			throw error(404, 'User not found');
		}

		// Get all user's transactions
		const transactions = await db
			.select({
				id: transaction.id,
				coinId: transaction.coinId,
				coinName: coin.name,
				coinSymbol: coin.symbol,
				type: transaction.type,
				quantity: transaction.quantity,
				pricePerCoin: transaction.pricePerCoin,
				totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount,
				timestamp: transaction.timestamp
			})
			.from(transaction)
			.leftJoin(coin, eq(transaction.coinId, coin.id))
			.where(eq(transaction.userId, userId));

		// Get user's portfolio
		const portfolio = await db
			.select({
				coinId: userPortfolio.coinId,
				coinName: coin.name,
				coinSymbol: coin.symbol,
				quantity: userPortfolio.quantity,
				updatedAt: userPortfolio.updatedAt
			})
			.from(userPortfolio)
			.leftJoin(coin, eq(userPortfolio.coinId, coin.id))
			.where(eq(userPortfolio.userId, userId));

		// Get user's prediction bets
		const predictionBets = await db
			.select({
				id: predictionBet.id,
				questionId: predictionBet.questionId,
				question: predictionQuestion.question,
				side: predictionBet.side,
				amount: predictionBet.amount,
				actualWinnings: predictionBet.actualWinnings,
				createdAt: predictionBet.createdAt,
				settledAt: predictionBet.settledAt
			})
			.from(predictionBet)
			.leftJoin(predictionQuestion, eq(predictionBet.questionId, predictionQuestion.id))
			.where(eq(predictionBet.userId, userId));

		// Get user's comments
		const comments = await db
			.select({
				id: comment.id,
				coinId: comment.coinId,
				coinName: coin.name,
				coinSymbol: coin.symbol,
				content: comment.content,
				likesCount: comment.likesCount,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				isDeleted: comment.isDeleted
			})
			.from(comment)
			.leftJoin(coin, eq(comment.coinId, coin.id))
			.where(eq(comment.userId, userId));

		// Get user's comment likes
		const commentLikes = await db
			.select({
				commentId: commentLike.commentId,
				createdAt: commentLike.createdAt
			})
			.from(commentLike)
			.where(eq(commentLike.userId, userId));

		// Get user's promo code redemptions
		const promoRedemptions = await db
			.select({
				id: promoCodeRedemption.id,
				promoCodeId: promoCodeRedemption.promoCodeId,
				promoCode: promoCode.code,
				rewardAmount: promoCodeRedemption.rewardAmount,
				redeemedAt: promoCodeRedemption.redeemedAt
			})
			.from(promoCodeRedemption)
			.leftJoin(promoCode, eq(promoCodeRedemption.promoCodeId, promoCode.id))
			.where(eq(promoCodeRedemption.userId, userId));

		// Get user's sessions (limited to active ones for privacy)
		const sessions = await db
			.select({
				id: session.id,
				expiresAt: session.expiresAt,
				createdAt: session.createdAt,
				ipAddress: session.ipAddress,
				userAgent: session.userAgent
			})
			.from(session)
			.where(and(eq(session.userId, userId), lte(session.expiresAt, new Date())));

		// Get coins created by user
		const createdCoins = await db
			.select({
				id: coin.id,
				name: coin.name,
				symbol: coin.symbol,
				icon: coin.icon,
				initialSupply: coin.initialSupply,
				circulatingSupply: coin.circulatingSupply,
				marketCap: coin.marketCap,
				price: coin.currentPrice,
				change24h: coin.change24h,
				poolCoinAmount: coin.poolCoinAmount,
				poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount,
				createdAt: coin.createdAt,
				updatedAt: coin.updatedAt,
				isListed: coin.isListed
			})
			.from(coin)
			.where(eq(coin.creatorId, userId));

		// Get questions created by user
		const createdQuestions = await db
			.select()
			.from(predictionQuestion)
			.where(eq(predictionQuestion.creatorId, userId));

		// Compile all data
		const exportData = {
			exportInfo: {
				userId: userId,
				exportedAt: new Date().toISOString(),
				dataType: 'complete_user_data'
			},
			user: userData[0],
			transactions: transactions,
			portfolio: portfolio,
			predictionBets: predictionBets,
			comments: comments,
			commentLikes: commentLikes,
			promoCodeRedemptions: promoRedemptions,
			sessions: sessions,
			createdCoins: createdCoins,
			createdQuestions: createdQuestions
		}; // Serialize the data
		const jsonData = JSON.stringify(exportData, null, 2);
		const dataSize = new TextEncoder().encode(jsonData).length;

		// Return as downloadable JSON with proper headers for streaming download
		return new Response(jsonData, {
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="rugplay-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
				'Content-Length': dataSize.toString(),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0'
			}
		});
	} catch (err) {
		console.error('Data export error:', err);
		throw error(500, 'Failed to export user data');
	}
}
