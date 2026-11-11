import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, transaction, user, userFollow } from '$lib/server/db/schema';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { FOLLOWING_FEED_DAYS, FOLLOWING_FEED_MIN_VALUE } from '$lib/data/constants';

export async function GET({ request, url }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '6') || 6, 1), 30);
	const since = new Date(Date.now() - FOLLOWING_FEED_DAYS * 24 * 60 * 60 * 1000);

	const followed = db
		.select({ id: userFollow.followingId })
		.from(userFollow)
		.where(eq(userFollow.followerId, Number(session.user.id)));

	const rows = await db
		.select({
			id: transaction.id,
			type: transaction.type,
			totalValue: transaction.totalBaseCurrencyAmount,
			timestamp: transaction.timestamp,
			userId: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			nameColor: user.nameColor,
			coinSymbol: coin.symbol,
			coinName: coin.name,
			coinIcon: coin.icon
		})
		.from(transaction)
		.innerJoin(user, eq(user.id, transaction.userId))
		.innerJoin(coin, eq(coin.id, transaction.coinId))
		.where(
			and(
				inArray(transaction.userId, followed),
				inArray(transaction.type, ['BUY', 'SELL']),
				gte(transaction.totalBaseCurrencyAmount, FOLLOWING_FEED_MIN_VALUE.toString()),
				gte(transaction.timestamp, since)
			)
		)
		.orderBy(desc(transaction.timestamp))
		.limit(limit);

	return json({
		trades: rows.map((row) => ({
			...row,
			totalValue: Number(row.totalValue),
			timestamp: row.timestamp.getTime()
		}))
	});
}
