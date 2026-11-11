import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userPortfolio, coin, transaction } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const userId = Number(session.user.id);

	const [holding] = await db
		.select({ quantity: userPortfolio.quantity, coinId: coin.id })
		.from(userPortfolio)
		.innerJoin(coin, eq(userPortfolio.coinId, coin.id))
		.where(and(eq(userPortfolio.userId, userId), eq(coin.symbol, params.coinSymbol.toUpperCase())))
		.limit(1);

	const quantity = Number(holding?.quantity ?? 0);

	// Same attribution as /api/portfolio/total: walk the buys oldest first until
	// the coins still held are accounted for.
	let costBasis = 0;
	if (holding && quantity > 0) {
		const buys = await db
			.select({
				quantity: transaction.quantity,
				totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount
			})
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, userId),
					eq(transaction.coinId, holding.coinId),
					eq(transaction.type, 'BUY')
				)
			)
			.orderBy(transaction.timestamp);

		let remaining = quantity;
		for (const buy of buys) {
			if (remaining <= 0) break;
			const bought = Number(buy.quantity);
			if (bought <= 0) continue;
			const attributed = Math.min(bought, remaining);
			costBasis += attributed * (Number(buy.totalBaseCurrencyAmount) / bought);
			remaining -= attributed;
		}
	}

	return json({ quantity, costBasis }, {
		headers: { 'Cache-Control': 'private, no-store' }
	});
}
