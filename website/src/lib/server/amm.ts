import { db } from '$lib/server/db';
import { coin, transaction, priceHistory, userPortfolio } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { createNotification } from '$lib/server/notification';

export async function calculate24hMetrics(coinId: number, currentPrice: number) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [priceData] = await db
        .select({ price: priceHistory.price })
        .from(priceHistory)
        .where(and(
            eq(priceHistory.coinId, coinId),
            gte(priceHistory.timestamp, twentyFourHoursAgo)
        ))
        .orderBy(priceHistory.timestamp)
        .limit(1);

    let change24h = 0;
    if (priceData) {
        const priceFrom24hAgo = Number(priceData.price);
        if (priceFrom24hAgo > 0) {
            const raw = ((currentPrice - priceFrom24hAgo) / priceFrom24hAgo) * 100;
            change24h = Math.max(-9999999, Math.min(9999999, raw));
        }
    }

    const volumeData = await db
        .select({ totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount })
        .from(transaction)
        .where(and(
            eq(transaction.coinId, coinId),
            gte(transaction.timestamp, twentyFourHoursAgo)
        ));

    const volume24h = volumeData.reduce((sum, tx) => sum + Number(tx.totalBaseCurrencyAmount), 0);

    return { change24h: Number(change24h.toFixed(4)), volume24h: Number(volume24h.toFixed(4)) };
}

export async function executeSellTrade(
    tx: any,
    coinData: any,
    userId: number,
    quantity: number
) {
    const poolCoinAmount = Number(coinData.poolCoinAmount);
    const poolBaseCurrencyAmount = Number(coinData.poolBaseCurrencyAmount);
    const currentPrice = Number(coinData.currentPrice);

    if (poolCoinAmount <= 0 || poolBaseCurrencyAmount <= 0) {
        throw new Error('Liquidity pool is not properly initialized or is empty');
    }

    const k = poolCoinAmount * poolBaseCurrencyAmount;
    const newPoolCoin = poolCoinAmount + quantity;
    const newPoolBaseCurrency = k / newPoolCoin;
    const baseCurrencyReceived = poolBaseCurrencyAmount - newPoolBaseCurrency;
    const newPrice = newPoolBaseCurrency / newPoolCoin;

    if (baseCurrencyReceived <= 0 || newPoolBaseCurrency < 1) {
        const fallbackValue = quantity * currentPrice;
        return {
            success: false,
            fallbackValue,
            newPrice: currentPrice,
            priceImpact: 0
        };
    }

    const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;

    await tx.insert(transaction).values({
        userId,
        coinId: coinData.id,
        type: 'SELL',
        quantity: quantity.toString(),
        pricePerCoin: (baseCurrencyReceived / quantity).toString(),
        totalBaseCurrencyAmount: baseCurrencyReceived.toString(),
        timestamp: new Date()
    });

    await tx.insert(priceHistory).values({
        coinId: coinData.id,
        price: newPrice.toString()
    });

    const metrics = await calculate24hMetrics(coinData.id, newPrice);

    await tx.update(coin)
        .set({
            currentPrice: newPrice.toString(),
            marketCap: (Number(coinData.circulatingSupply) * newPrice).toString(),
            poolCoinAmount: newPoolCoin.toString(),
            poolBaseCurrencyAmount: newPoolBaseCurrency.toString(),
            change24h: metrics.change24h.toString(),
            volume24h: metrics.volume24h.toString(),
            updatedAt: new Date()
        })
        .where(eq(coin.id, coinData.id));

    const isRugPull = priceImpact < -20 && baseCurrencyReceived > 1000;
    if (isRugPull) {
        (async () => {
            try {
                const affectedUsers = await db
                    .select({
                        userId: userPortfolio.userId,
                        quantity: userPortfolio.quantity
                    })
                    .from(userPortfolio)
                    .where(eq(userPortfolio.coinId, coinData.id));

                for (const holder of affectedUsers) {
                    if (holder.userId === userId) continue;
                    
                    const holdingValue = Number(holder.quantity) * newPrice;
                    if (holdingValue > 10) {
                        await createNotification(
                            holder.userId.toString(),
                            'RUG_PULL',
                            'Coin rugpulled!',
                            `A coin you owned, ${coinData.name} (*${coinData.symbol}), crashed ${Math.abs(priceImpact).toFixed(1)}%!`,
                            `/coin/${coinData.symbol}`
                        );
                    }
                }
            } catch (error) {
                console.error('Error sending rug pull notifications:', error);
            }
        })();
    }

    return {
        success: true,
        baseCurrencyReceived,
        newPrice,
        priceImpact,
        newPoolCoin,
        newPoolBaseCurrency,
        metrics
    };
}
