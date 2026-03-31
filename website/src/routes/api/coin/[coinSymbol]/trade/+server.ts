import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, userPortfolio, user, transaction, priceHistory } from '$lib/server/db/schema';
import { eq, and, gte, asc } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { createNotification } from '$lib/server/notification';
import { calculate24hMetrics, executeSellTrade } from '$lib/server/amm';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export async function POST({ params, request }) {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const { coinSymbol } = params;
    const { type, amount } = await request.json();

    if (!['BUY', 'SELL'].includes(type)) {
        throw error(400, 'Invalid transaction type');
    }

    if (!amount || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        throw error(400, 'Invalid amount - must be a positive finite number');
    }

    if (amount > Number.MAX_SAFE_INTEGER) {
        throw error(400, 'Amount too large');
    }

    const userId = Number(session.user.id);
    const normalizedSymbol = coinSymbol.toUpperCase();

    const [coinExists] = await db.select({ id: coin.id }).from(coin).where(eq(coin.symbol, normalizedSymbol)).limit(1);
    if (!coinExists) {
        throw error(404, 'Coin not found');
    }

    const txResult = await db.transaction(async (tx) => {
        const [coinData] = await tx.select({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            icon: coin.icon,
            currentPrice: coin.currentPrice,
            poolCoinAmount: coin.poolCoinAmount,
            poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount,
            circulatingSupply: coin.circulatingSupply,
            isListed: coin.isListed,
            creatorId: coin.creatorId,
            tradingUnlocksAt: coin.tradingUnlocksAt,
            isLocked: coin.isLocked,
            change24h: coin.change24h,
            createdAt: coin.createdAt
        }).from(coin).where(eq(coin.symbol, normalizedSymbol)).for('update').limit(1);

        if (!coinData) {
            throw error(404, 'Coin not found');
        }

        if (!coinData.isListed) {
            throw error(400, 'This coin is delisted and cannot be traded');
        }

        if (coinData.isLocked && coinData.tradingUnlocksAt && userId !== coinData.creatorId) {
            const unlockTime = new Date(coinData.tradingUnlocksAt);
            if (new Date() < unlockTime) {
                const remainingSeconds = Math.ceil((unlockTime.getTime() - Date.now()) / 1000);
                throw error(400, `Trading is locked. Unlocks in ${remainingSeconds} seconds.`);
            }
            
            await tx.update(coin)
                .set({ isLocked: false })
                .where(eq(coin.id, coinData.id));
        }

        const [userData] = await tx.select({
            baseCurrencyBalance: user.baseCurrencyBalance,
            username: user.username,
            image: user.image
        }).from(user).where(eq(user.id, userId)).for('update').limit(1);

        if (!userData) {
            throw error(404, 'User not found');
        }

        const userBalance = Number(userData.baseCurrencyBalance);
        const poolCoinAmount = Number(coinData.poolCoinAmount);
        const poolBaseCurrencyAmount = Number(coinData.poolBaseCurrencyAmount);
        const currentPrice = Number(coinData.currentPrice);

        let newPrice: number;
        let totalCost: number;
        let priceImpact: number = 0;

        if (poolCoinAmount <= 0 || poolBaseCurrencyAmount <= 0) {
            throw error(400, 'Liquidity pool is not properly initialized or is empty. Trading halted.');
        }

        if (type === 'BUY') {
            // AMM BUY: amount = dollars to spend
            const k = poolCoinAmount * poolBaseCurrencyAmount;
            const newPoolBaseCurrency = poolBaseCurrencyAmount + amount;
            const newPoolCoin = k / newPoolBaseCurrency;
            const coinsBought = poolCoinAmount - newPoolCoin;

            totalCost = amount;
            newPrice = newPoolBaseCurrency / newPoolCoin;
            priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;

            if (userBalance < totalCost) {
                throw error(400, `Insufficient funds. You need *${totalCost.toFixed(6)} BUSS but only have *${userBalance.toFixed(6)} BUSS`);
            }

            if (coinsBought <= 0) {
                throw error(400, 'Trade amount too small - would result in zero tokens');
            }

            await tx.update(user)
                .set({
                    baseCurrencyBalance: (userBalance - totalCost).toString(),
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            const [existingHolding] = await tx
                .select({ quantity: userPortfolio.quantity })
                .from(userPortfolio)
                .where(and(
                    eq(userPortfolio.userId, userId),
                    eq(userPortfolio.coinId, coinData.id)
                ))
                .limit(1);

            if (existingHolding) {
                const newQuantity = Number(existingHolding.quantity) + coinsBought;
                await tx.update(userPortfolio)
                    .set({
                        quantity: newQuantity.toString(),
                        updatedAt: new Date()
                    })
                    .where(and(
                        eq(userPortfolio.userId, userId),
                        eq(userPortfolio.coinId, coinData.id)
                    ));
            } else {
                await tx.insert(userPortfolio).values({
                    userId,
                    coinId: coinData.id,
                    quantity: coinsBought.toString()
                });
            }

            await tx.insert(transaction).values({
                userId,
                coinId: coinData.id,
                type: 'BUY',
                quantity: coinsBought.toString(),
                pricePerCoin: (totalCost / coinsBought).toString(),
                totalBaseCurrencyAmount: totalCost.toString()
            });

            await tx.insert(priceHistory).values({
                coinId: coinData.id,
                price: newPrice.toString()
            });

            const metrics = await calculate24hMetrics(coinData.id, newPrice, tx);

            const MAX_STORABLE = 1e38;
            const safeMarketCap = Math.min(Number(coinData.circulatingSupply) * newPrice, MAX_STORABLE);
            const safeVolume = Math.min(metrics.volume24h, MAX_STORABLE);

            await tx.update(coin)
                .set({
                    currentPrice: newPrice.toString(),
                    marketCap: safeMarketCap.toString(),
                    poolCoinAmount: newPoolCoin.toString(),
                    poolBaseCurrencyAmount: newPoolBaseCurrency.toString(),
                    change24h: metrics.change24h.toString(),
                    volume24h: safeVolume.toString(),
                    updatedAt: new Date()
                })
                .where(eq(coin.id, coinData.id));

            const priceUpdateData = {
                currentPrice: newPrice,
                marketCap: safeMarketCap,
                change24h: metrics.change24h,
                volume24h: safeVolume,
                poolCoinAmount: newPoolCoin,
                poolBaseCurrencyAmount: newPoolBaseCurrency
            };

            const tradeData = {
                type: 'BUY' as const,
                username: userData.username,
                userImage: userData.image || '',
                amount: coinsBought,
                coinSymbol: normalizedSymbol,
                coinName: coinData.name,
                coinIcon: coinData.icon || '',
                totalValue: totalCost,
                price: newPrice,
                timestamp: Date.now(),
                userId: userId.toString()
            };

            return {
                tradeType: 'BUY' as const,
                priceUpdateData,
                tradeData,
                totalCost,
                coinsBought,
                newPrice,
                priceImpact,
                newBalance: userBalance - totalCost,
                coinChange24h: Number(coinData.change24h || 0),
                oldPrice: currentPrice
            };

        } else {
            // AMM SELL: amount = number of coins to sell
            const [userHolding] = await tx
                .select({ quantity: userPortfolio.quantity })
                .from(userPortfolio)
                .where(and(
                    eq(userPortfolio.userId, userId),
                    eq(userPortfolio.coinId, coinData.id)
                ))
                .limit(1);

            if (!userHolding || Number(userHolding.quantity) < amount) {
                throw error(400, `Insufficient coins. You have ${userHolding ? Number(userHolding.quantity) : 0} but trying to sell ${amount}`);
            }

            // Allow more aggressive selling for rug pull simulation - prevent only mathematical breakdown
            const maxSellable = Math.floor(Number(coinData.poolCoinAmount) * 0.995);
            if (amount > maxSellable) {
                throw error(400, `Cannot sell more than 99.5% of pool tokens. Max sellable: ${maxSellable} tokens`);
            }

            const sellResult = await executeSellTrade(tx, coinData, userId, amount);

            if (!sellResult.success) {
                throw error(400, 'Trade failed - insufficient liquidity or invalid parameters');
            }

            totalCost = sellResult.baseCurrencyReceived ?? 0;
            newPrice = sellResult.newPrice;
            priceImpact = sellResult.priceImpact;

            if (totalCost <= 0) {
                throw error(400, 'Trade amount results in zero base currency received');
            }

            await tx.update(user)
                .set({
                    baseCurrencyBalance: (userBalance + totalCost).toString(),
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            const newQuantity = Number(userHolding.quantity) - amount;
            if (newQuantity > 0.000001) {
                await tx.update(userPortfolio)
                    .set({
                        quantity: newQuantity.toString(),
                        updatedAt: new Date()
                    })
                    .where(and(
                        eq(userPortfolio.userId, userId),
                        eq(userPortfolio.coinId, coinData.id)
                    ));
            } else {
                await tx.delete(userPortfolio)
                    .where(and(
                        eq(userPortfolio.userId, userId),
                        eq(userPortfolio.coinId, coinData.id)
                    ));
            }

            const metrics = sellResult.metrics || await calculate24hMetrics(coinData.id, newPrice, tx);

            const priceUpdateData = {
                currentPrice: newPrice,
                marketCap: Number(coinData.circulatingSupply) * newPrice,
                change24h: metrics.change24h,
                volume24h: metrics.volume24h,
                poolCoinAmount: sellResult.newPoolCoin,
                poolBaseCurrencyAmount: sellResult.newPoolBaseCurrency
            };

            const tradeData = {
                type: 'SELL' as const,
                username: userData.username,
                userImage: userData.image || '',
                amount: amount,
                coinSymbol: normalizedSymbol,
                coinName: coinData.name,
                coinIcon: coinData.icon || '',
                totalValue: totalCost,
                price: newPrice,
                timestamp: Date.now(),
                userId: userId.toString()
            };

            return {
                tradeType: 'SELL' as const,
                priceUpdateData,
                tradeData,
                totalCost,
                coinsSold: amount,
                coinId: coinData.id,
                newPrice,
                priceImpact,
                newBalance: userBalance + totalCost,
                coinChange24h: metrics.change24h,
                oldPrice: currentPrice,
                coinCreatedAt: coinData.createdAt
            };
        }
    });

    redis.publish(`prices:${normalizedSymbol}`, JSON.stringify(txResult.priceUpdateData)).catch(console.error);
    redis.publish('trades:all', JSON.stringify({ type: 'all-trades', data: txResult.tradeData })).catch(console.error);
    if (txResult.totalCost >= 1000) {
        redis.publish('trades:large', JSON.stringify({ type: 'live-trade', data: txResult.tradeData })).catch(console.error);
    }

    if (txResult.tradeType === 'BUY') {
        checkAndAwardAchievements(userId, ['trading', 'wealth', 'special'], {
            tradeType: 'BUY',
            tradeAmount: txResult.totalCost,
            coinChange24h: txResult.coinChange24h,
            newBalance: txResult.newBalance,
            newPrice: txResult.newPrice,
            oldPrice: txResult.oldPrice
        });

        return json({
            success: true,
            type: 'BUY',
            coinsBought: txResult.coinsBought,
            totalCost: txResult.totalCost,
            newPrice: txResult.newPrice,
            priceImpact: txResult.priceImpact,
            newBalance: txResult.newBalance
        });
    } else {
        checkAndAwardAchievements(userId, ['trading', 'wealth', 'creation', 'special'], {
            tradeType: 'SELL',
            tradeAmount: txResult.totalCost,
            coinChange24h: txResult.coinChange24h,
            newBalance: txResult.newBalance,
            newPrice: txResult.newPrice,
            oldPrice: txResult.oldPrice,
            coinCreatedAt: txResult.coinCreatedAt,
            firstInvestmentAt: await getFirstBuyTimestamp(userId, txResult.coinId)
        });

        return json({
            success: true,
            type: 'SELL',
            coinsSold: txResult.coinsSold,
            totalReceived: txResult.totalCost,
            newPrice: txResult.newPrice,
            priceImpact: txResult.priceImpact,
            newBalance: txResult.newBalance
        });
    }
}

async function getFirstBuyTimestamp(userId: number, coinId: number): Promise<Date | undefined> {
    try {
        const [firstBuy] = await db
            .select({ timestamp: transaction.timestamp })
            .from(transaction)
            .where(
                and(
                    eq(transaction.userId, userId),
                    eq(transaction.coinId, coinId),
                    eq(transaction.type, 'BUY')
                )
            )
            .orderBy(asc(transaction.timestamp))
            .limit(1);
        return firstBuy?.timestamp ?? undefined;
    } catch {
        return undefined;
    }
}