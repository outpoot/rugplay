import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, userPortfolio, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { validateSearchParams } from '$lib/utils/validation';

function calculateLiquidationValue(tokensToSell: number, poolCoinAmount: number, poolBaseCurrencyAmount: number): number {
    if (tokensToSell <= 0 || poolCoinAmount <= 0 || poolBaseCurrencyAmount <= 0) {
        return 0;
    }

    const maxSellable = poolCoinAmount * 0.995;
    const actualTokensToSell = Math.min(tokensToSell, maxSellable);
    const k = poolCoinAmount * poolBaseCurrencyAmount;
    const newPoolCoin = poolCoinAmount + actualTokensToSell;
    const newPoolBaseCurrency = k / newPoolCoin;
    const baseCurrencyReceived = poolBaseCurrencyAmount - newPoolBaseCurrency;

    return Math.max(0, baseCurrencyReceived);
}

export async function GET({ params, url }) {
    const coinSymbol = params.coinSymbol?.toUpperCase();
    const validator = validateSearchParams(url.searchParams);
    const limit = validator.getPositiveInt('limit', 50);

    if (!coinSymbol) {
        throw error(400, 'Coin symbol is required');
    }

    if (limit > 200) {
        throw error(400, 'Limit cannot exceed 200');
    }

    try {
        const [coinData] = await db
            .select({
                id: coin.id,
                symbol: coin.symbol,
                circulatingSupply: coin.circulatingSupply,
                poolCoinAmount: coin.poolCoinAmount,
                poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount,
                currentPrice: coin.currentPrice
            })
            .from(coin)
            .where(eq(coin.symbol, coinSymbol))
            .limit(1);

        if (!coinData) {
            throw error(404, 'Coin not found');
        }

        const holders = await db
            .select({
                userId: user.id,
                username: user.username,
                name: user.name,
                image: user.image,
                quantity: userPortfolio.quantity
            })
            .from(userPortfolio)
            .innerJoin(user, eq(userPortfolio.userId, user.id))
            .where(eq(userPortfolio.coinId, coinData.id))
            .orderBy(desc(userPortfolio.quantity))
            .limit(limit);

        const totalCirculating = Number(coinData.circulatingSupply);
        const poolCoinAmount = Number(coinData.poolCoinAmount);
        const poolBaseCurrencyAmount = Number(coinData.poolBaseCurrencyAmount);

        const processedHolders = holders.map((holder, index) => {
            const quantity = Number(holder.quantity);
            const percentage = totalCirculating > 0 ? (quantity / totalCirculating) * 100 : 0;
            const liquidationValue = calculateLiquidationValue(quantity, poolCoinAmount, poolBaseCurrencyAmount);

            return {
                rank: index + 1,
                userId: holder.userId,
                username: holder.username,
                name: holder.name,
                image: holder.image,
                quantity,
                percentage,
                liquidationValue
            };
        });

        return json({
            coinSymbol: coinData.symbol,
            totalHolders: holders.length,
            circulatingSupply: totalCirculating,
            poolInfo: {
                coinAmount: poolCoinAmount,
                baseCurrencyAmount: poolBaseCurrencyAmount,
                currentPrice: Number(coinData.currentPrice)
            },
            holders: processedHolders
        });

    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        console.error('Unexpected error in holders API:', e);
        throw error(500, 'Internal server error');
    }
}
