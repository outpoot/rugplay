import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transaction, user, coin } from '$lib/server/db/schema';
import { desc, gte, eq } from 'drizzle-orm';
import { validateSearchParams } from '$lib/utils/validation';

export async function GET({ url }) {
	const params = validateSearchParams(url.searchParams);
	const requestedLimit = params.getPositiveInt('limit', 100);
	const limit = Math.min(requestedLimit, 1000);
	const minValue = params.getNonNegativeFloat('minValue', 0);

	try {
		const trades = await db
			.select({
				type: transaction.type,
				username: user.username,
				userImage: user.image,
				amount: transaction.quantity,
				coinSymbol: coin.symbol,
				coinName: coin.name,
				coinIcon: coin.icon,
				totalValue: transaction.totalBaseCurrencyAmount,
				price: transaction.pricePerCoin,
				timestamp: transaction.timestamp,
				userId: transaction.userId
			})
			.from(transaction)
			.innerJoin(user, eq(user.id, transaction.userId))
			.innerJoin(coin, eq(coin.id, transaction.coinId))
			.where(
				minValue > 0 ? gte(transaction.totalBaseCurrencyAmount, minValue.toString()) : undefined
			)
			.orderBy(desc(transaction.timestamp))
			.limit(limit);

		const formattedTrades = trades.map((trade) => ({
			type: trade.type as 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT',
			username: trade.username,
			userImage: trade.userImage,
			amount: Number(trade.amount),
			coinSymbol: trade.coinSymbol,
			coinName: trade.coinName,
			coinIcon: trade.coinIcon,
			totalValue: Number(trade.totalValue),
			price: Number(trade.price),
			timestamp: trade.timestamp.getTime(),
			userId: trade.userId?.toString() ?? ''
		}));

		return json({ trades: formattedTrades });
	} catch (error) {
		console.error('Error fetching recent trades:', error);
		return json({ trades: [] });
	}
}
