import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
	try {
		const coins = await db
			.select({
				symbol: coin.symbol,
				name: coin.name,
				icon: coin.icon,
				currentPrice: coin.currentPrice,
				change24h: coin.change24h, // Read directly from DB
				marketCap: coin.marketCap,
				volume24h: coin.volume24h // Read directly from DB
			})
			.from(coin)
			.where(eq(coin.isListed, true))
			.orderBy(desc(coin.marketCap))
			.limit(50);

		const formattedCoins = coins.map((c) => ({
			symbol: c.symbol,
			name: c.name,
			icon: c.icon,
			price: Number(c.currentPrice),
			change24h: Number(c.change24h),
			marketCap: Number(c.marketCap),
			volume24h: Number(c.volume24h)
		}));

		return json({ coins: formattedCoins });
	} catch (e) {
		console.error('Error fetching top coins:', e);
		return json({ coins: [] });
	}
}
