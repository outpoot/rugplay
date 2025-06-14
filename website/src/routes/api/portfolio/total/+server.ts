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
        db.select({ baseCurrencyBalance: user.baseCurrencyBalance })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1),

        db.select({
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

    const coinHoldings = await Promise.all(holdings.map(async (holding) => {
        const quantity = Number(holding.quantity);
        const price = Number(holding.currentPrice);
        const value = quantity * price;
        totalCoinValue += value;

        // Calculate total cost basis from buy transactions
        const costBasisResult = await db.select({
            totalCostBasis: sql<number>`COALESCE(SUM(${transaction.totalBaseCurrencyAmount}), 0)`
        })
            .from(transaction)
            .where(
                and(
                    eq(transaction.userId, userId),
                    eq(transaction.coinId, holding.coinId),
                    eq(transaction.type, 'BUY')
                )
            );

        // Calculate average purchase price for reference
        const avgPriceResult = await db.select({
            avgPrice: sql<number>`
                CASE 
                    WHEN SUM(${transaction.quantity}) > 0 
                    THEN SUM(${transaction.totalBaseCurrencyAmount}) / SUM(${transaction.quantity})
                    ELSE 0 
                END
            `
        })
            .from(transaction)
            .where(
                and(
                    eq(transaction.userId, userId),
                    eq(transaction.coinId, holding.coinId),
                    eq(transaction.type, 'BUY')
                )
            );

        const totalCostBasis = Number(costBasisResult[0]?.totalCostBasis || 0);
        const avgPurchasePrice = Number(avgPriceResult[0]?.avgPrice || 0);

        const percentageChange = totalCostBasis > 0
            ? ((value - totalCostBasis) / totalCostBasis) * 100
            : 0;

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
    }));

    const baseCurrencyBalance = Number(userData[0].baseCurrencyBalance);

    return json({
        baseCurrencyBalance,
        totalCoinValue,
        totalValue: baseCurrencyBalance + totalCoinValue,
        coinHoldings,
        currency: '$'
    });
}
