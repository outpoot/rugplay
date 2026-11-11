import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, userWatchlist } from '$lib/server/db/schema';
import { and, count, eq } from 'drizzle-orm';
import { MAX_WATCHLIST_COINS } from '$lib/data/constants';

async function resolve(request: Request, coinSymbol: string) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const [coinData] = await db
		.select({ id: coin.id })
		.from(coin)
		.where(eq(coin.symbol, coinSymbol.toUpperCase()))
		.limit(1);
	if (!coinData) throw error(404, 'Coin not found');

	return { userId: Number(session.user.id), coinId: coinData.id };
}

export async function GET({ request, params }) {
	const { userId, coinId } = await resolve(request, params.coinSymbol);

	const [row] = await db
		.select({ coinId: userWatchlist.coinId })
		.from(userWatchlist)
		.where(and(eq(userWatchlist.userId, userId), eq(userWatchlist.coinId, coinId)))
		.limit(1);

	return json({ watched: !!row });
}

export async function POST({ request, params }) {
	const { userId, coinId } = await resolve(request, params.coinSymbol);

	const [{ total }] = await db
		.select({ total: count() })
		.from(userWatchlist)
		.where(eq(userWatchlist.userId, userId));
	if (total >= MAX_WATCHLIST_COINS) {
		throw error(400, `Your watchlist is full (${MAX_WATCHLIST_COINS} coins max)`);
	}

	await db.insert(userWatchlist).values({ userId, coinId }).onConflictDoNothing();

	return json({ watched: true });
}

export async function DELETE({ request, params }) {
	const { userId, coinId } = await resolve(request, params.coinSymbol);

	await db
		.delete(userWatchlist)
		.where(and(eq(userWatchlist.userId, userId), eq(userWatchlist.coinId, coinId)));

	return json({ watched: false });
}
