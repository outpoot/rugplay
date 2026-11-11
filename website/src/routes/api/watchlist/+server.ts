import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, userWatchlist } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const userId = Number(session.user.id);

	const coins = await db
		.select({
			symbol: coin.symbol,
			name: coin.name,
			icon: coin.icon,
			currentPrice: coin.currentPrice,
			change24h: coin.change24h,
			marketCap: coin.marketCap,
			volume24h: coin.volume24h,
			isListed: coin.isListed
		})
		.from(userWatchlist)
		.innerJoin(coin, eq(userWatchlist.coinId, coin.id))
		.where(eq(userWatchlist.userId, userId))
		.orderBy(desc(userWatchlist.createdAt));

	return json({
		coins: coins.map((c) => ({
			symbol: c.symbol,
			name: c.name,
			icon: c.icon,
			price: Number(c.currentPrice),
			change24h: Number(c.change24h),
			marketCap: Number(c.marketCap),
			volume24h: Number(c.volume24h),
			isListed: c.isListed
		}))
	});
}
