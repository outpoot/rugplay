import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userPortfolio, coin } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const [holding] = await db
		.select({ quantity: userPortfolio.quantity })
		.from(userPortfolio)
		.innerJoin(coin, eq(userPortfolio.coinId, coin.id))
		.where(and(eq(userPortfolio.userId, Number(session.user.id)), eq(coin.symbol, params.coinSymbol.toUpperCase())))
		.limit(1);

	return json({ quantity: Number(holding?.quantity ?? 0) }, {
		headers: { 'Cache-Control': 'private, no-store' }
	});
}
