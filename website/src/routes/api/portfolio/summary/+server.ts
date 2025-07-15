import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { AMMSell } from '$lib/server/amm';
import { user, userPortfolio, coin } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const userId = Number(session.user.id);

    const [userData, holdings] = await Promise.all([
        db.select({ baseCurrencyBalance: user.baseCurrencyBalance })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1),

        db.select({
            quantity: userPortfolio.quantity,
            poolCoinAmount: coin.poolCoinAmount,
            poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount
        })
            .from(userPortfolio)
            .innerJoin(coin, eq(userPortfolio.coinId, coin.id))
            .where(eq(userPortfolio.userId, userId))
    ]);

    if (!userData[0]) {
        throw error(404, 'User not found');
    }

    let totalCoinValue = 0;

    for (const holding of holdings) {
        const quantity = Number(holding.quantity);
        const poolCoinAmount = Number(holding.poolCoinAmount);
        const poolBaseCurrencyAmount = Number(holding.poolBaseCurrencyAmount);

        const baseCurrencyReceived = AMMSell(poolCoinAmount, poolBaseCurrencyAmount, quantity);

        totalCoinValue += baseCurrencyReceived;
    }

    const baseCurrencyBalance = Number(userData[0].baseCurrencyBalance);

    return json({
        baseCurrencyBalance,
        totalCoinValue,
        totalValue: baseCurrencyBalance + totalCoinValue,
        currency: '$'
    });
}
