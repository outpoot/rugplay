import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userPortfolio, coin, transaction } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = Number(session.user.id);

	const [userData, holdings] = await Promise.all([
		db
			.select({ baseCurrencyBalance: user.baseCurrencyBalance })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1),

		db
			.select({
				quantity: userPortfolio.quantity,
				currentPrice: coin.currentPrice,
				symbol: coin.symbol,
				icon: coin.icon,
				change24h: coin.change24h,
				coinId: coin.id
			})
			.from(userPortfolio)
			.innerJoin(coin, eq(userPortfolio.coinId, coin.id))
			.where(eq(userPortfolio.userId, userId))
	]);

	if (!userData[0]) {
		throw error(404, 'User not found');
	}

	let totalCoinValue = 0;

	const coinHoldings = await Promise.all(
		holdings.map(async (holding) => {
			const quantity = Number(holding.quantity);
			const price = Number(holding.currentPrice);
			const value = quantity * price;
			totalCoinValue += value;

			const allTransactions = await db
				.select({
					type: transaction.type,
					quantity: transaction.quantity,
					totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount,
					timestamp: transaction.timestamp
				})
				.from(transaction)
				.where(and(eq(transaction.userId, userId), eq(transaction.coinId, holding.coinId)))
				.orderBy(transaction.timestamp);

			// calculate cost basis
			let remainingQuantity = quantity;
			let totalCostBasis = 0;
			let runningQuantity = 0;

			for (const tx of allTransactions) {
				const txQuantity = Number(tx.quantity);
				const txAmount = Number(tx.totalBaseCurrencyAmount);

				if (tx.type === 'BUY') {
					runningQuantity += txQuantity;

					// if we still need to account for held coins
					if (remainingQuantity > 0) {
						const quantityToAttribute = Math.min(txQuantity, remainingQuantity);
						const avgPrice = txAmount / txQuantity;
						totalCostBasis += quantityToAttribute * avgPrice;
						remainingQuantity -= quantityToAttribute;
					}
				} else if (tx.type === 'SELL') {
					runningQuantity -= txQuantity;
				}

				// if we accounted for all held coins, break
				if (remainingQuantity <= 0) break;
			}

			const avgPurchasePrice = quantity > 0 ? totalCostBasis / quantity : 0;

			const percentageChange =
				totalCostBasis > 0 ? ((value - totalCostBasis) / totalCostBasis) * 100 : 0;

			return {
				symbol: holding.symbol,
				icon: holding.icon,
				quantity,
				currentPrice: price,
				value,
				change24h: Number(holding.change24h),
				avgPurchasePrice,
				percentageChange,
				costBasis: totalCostBasis
			};
		})
	);

	const baseCurrencyBalance = Number(userData[0].baseCurrencyBalance);

	return json({
		baseCurrencyBalance,
		totalCoinValue,
		totalValue: baseCurrencyBalance + totalCoinValue,
		coinHoldings,
		currency: '$'
	});
}
