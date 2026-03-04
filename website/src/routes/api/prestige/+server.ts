import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userPortfolio, transaction, notifications, coin, priceHistory } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { formatValue, getPrestigeCost, getPrestigeName } from '$lib/utils';
import { checkAndAwardAchievements } from '$lib/server/achievements';

const BATCH_CHUNK_SIZE = 500;

export const POST: RequestHandler = async ({ request, locals }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);

    return await db.transaction(async (tx) => {
        const [userData] = await tx
            .select({
                baseCurrencyBalance: user.baseCurrencyBalance,
                prestigeLevel: user.prestigeLevel
            })
            .from(user)
            .where(eq(user.id, userId))
            .for('update')
            .limit(1);

        if (!userData) throw error(404, 'User not found');

        const currentPrestige = userData.prestigeLevel || 0;
        const nextPrestige = currentPrestige + 1;
        const prestigeCost = getPrestigeCost(nextPrestige);
        const prestigeName = getPrestigeName(nextPrestige);

        if (!prestigeCost || !prestigeName) {
            throw error(400, 'Maximum prestige level reached');
        }

        const currentCashBalance = Number(userData.baseCurrencyBalance);
        if (currentCashBalance < prestigeCost) {
            throw error(400, `Insufficient cash funds for prestige. Need ${formatValue(prestigeCost)} cash, have ${formatValue(currentCashBalance)} cash. Coin holdings cannot be used for prestige costs.`);
        }

        const holdings = await tx
            .select({
                coinId: userPortfolio.coinId,
                quantity: userPortfolio.quantity,
                currentPrice: coin.currentPrice,
                symbol: coin.symbol,
                poolCoinAmount: coin.poolCoinAmount,
                poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount,
                circulatingSupply: coin.circulatingSupply
            })
            .from(userPortfolio)
            .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
            .where(eq(userPortfolio.userId, userId));

        let warningMessage = '';
        let totalSaleValue = 0;

        if (holdings.length > 0) {
            warningMessage = `All ${holdings.length} coin holdings have been sold at current market prices. `;

            const now = new Date();
            const transactionRows: {
                userId: number;
                coinId: number;
                type: 'SELL';
                quantity: string;
                pricePerCoin: string;
                totalBaseCurrencyAmount: string;
                timestamp: Date;
            }[] = [];
            const priceHistoryRows: {
                coinId: number;
                price: string;
            }[] = [];
            const coinUpdates: {
                id: number;
                newPrice: number;
                newPoolCoin: number;
                newPoolBaseCurrency: number;
                marketCap: number;
            }[] = [];

            const MAX_STORABLE = 1e38;

            for (const holding of holdings) {
                const quantity = Number(holding.quantity);
                const currentPrice = Number(holding.currentPrice);
                const poolCoinAmount = Number(holding.poolCoinAmount);
                const poolBaseCurrencyAmount = Number(holding.poolBaseCurrencyAmount);

                if (poolCoinAmount <= 0 || poolBaseCurrencyAmount <= 0) {
                    const fallbackValue = quantity * currentPrice;
                    totalSaleValue += fallbackValue;

                    transactionRows.push({
                        userId,
                        coinId: holding.coinId!,
                        type: 'SELL',
                        quantity: holding.quantity!,
                        pricePerCoin: holding.currentPrice || '0',
                        totalBaseCurrencyAmount: fallbackValue.toString(),
                        timestamp: now
                    });
                    continue;
                }

                const k = poolCoinAmount * poolBaseCurrencyAmount;
                const newPoolCoin = poolCoinAmount + quantity;
                const newPoolBaseCurrency = k / newPoolCoin;
                const baseCurrencyReceived = poolBaseCurrencyAmount - newPoolBaseCurrency;
                const newPrice = newPoolBaseCurrency / newPoolCoin;

                if (baseCurrencyReceived <= 0 || newPoolBaseCurrency < 1) {
                    const fallbackValue = quantity * currentPrice;
                    totalSaleValue += fallbackValue;

                    transactionRows.push({
                        userId,
                        coinId: holding.coinId!,
                        type: 'SELL',
                        quantity: quantity.toString(),
                        pricePerCoin: currentPrice.toString(),
                        totalBaseCurrencyAmount: fallbackValue.toString(),
                        timestamp: now
                    });
                    continue;
                }

                totalSaleValue += baseCurrencyReceived;

                transactionRows.push({
                    userId,
                    coinId: holding.coinId!,
                    type: 'SELL',
                    quantity: quantity.toString(),
                    pricePerCoin: (baseCurrencyReceived / quantity).toString(),
                    totalBaseCurrencyAmount: baseCurrencyReceived.toString(),
                    timestamp: now
                });

                priceHistoryRows.push({
                    coinId: holding.coinId!,
                    price: newPrice.toString()
                });

                const circulatingSupply = Number(holding.circulatingSupply);
                if (!circulatingSupply || !isFinite(circulatingSupply)) {
                    continue;
                }

                const safeMarketCap = Math.min(
                    circulatingSupply * newPrice,
                    MAX_STORABLE
                );

                if (
                    !isFinite(newPrice) ||
                    !isFinite(newPoolCoin) ||
                    !isFinite(newPoolBaseCurrency) ||
                    !isFinite(safeMarketCap)
                ) {
                    continue;
                }

                coinUpdates.push({
                    id: holding.coinId!,
                    newPrice,
                    newPoolCoin,
                    newPoolBaseCurrency,
                    marketCap: safeMarketCap
                });
            }

            for (let i = 0; i < transactionRows.length; i += BATCH_CHUNK_SIZE) {
                const chunk = transactionRows.slice(i, i + BATCH_CHUNK_SIZE);
                await tx.insert(transaction).values(chunk);
            }

            for (let i = 0; i < priceHistoryRows.length; i += BATCH_CHUNK_SIZE) {
                const chunk = priceHistoryRows.slice(i, i + BATCH_CHUNK_SIZE);
                await tx.insert(priceHistory).values(chunk);
            }

            for (let i = 0; i < coinUpdates.length; i += BATCH_CHUNK_SIZE) {
                const chunk = coinUpdates.slice(i, i + BATCH_CHUNK_SIZE);

                const priceCases = sql.join(
                    chunk.map(c => sql`WHEN ${c.id} THEN ${c.newPrice.toString()}::numeric`),
                    sql` `
                );
                const marketCapCases = sql.join(
                    chunk.map(c => sql`WHEN ${c.id} THEN ${c.marketCap.toString()}::numeric`),
                    sql` `
                );
                const poolCoinCases = sql.join(
                    chunk.map(c => sql`WHEN ${c.id} THEN ${c.newPoolCoin.toString()}::numeric`),
                    sql` `
                );
                const poolBaseCases = sql.join(
                    chunk.map(c => sql`WHEN ${c.id} THEN ${c.newPoolBaseCurrency.toString()}::numeric`),
                    sql` `
                );
                const idList = sql.join(
                    chunk.map(c => sql`${c.id}`),
                    sql`, `
                );

                await tx.execute(sql`
                    UPDATE coin SET
                        current_price = CASE id ${priceCases} END,
                        market_cap = CASE id ${marketCapCases} END,
                        pool_coin_amount = CASE id ${poolCoinCases} END,
                        pool_base_currency_amount = CASE id ${poolBaseCases} END,
                        updated_at = NOW()
                    WHERE id IN (${idList})
                `);
            }

            await tx
                .delete(userPortfolio)
                .where(eq(userPortfolio.userId, userId));
        }

        await tx
            .update(user)
            .set({
                baseCurrencyBalance: '100.00000000',
                prestigeLevel: nextPrestige,
                lastRewardClaim: new Date(Date.now() - 12 * 60 * 60 * 1000),
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        await tx.insert(notifications).values({
            userId: userId,
            type: 'SYSTEM',
            title: `${prestigeName} Achieved!`,
            message: `Congratulations! You have successfully reached ${prestigeName}. Your portfolio has been reset, daily reward cooldown has been cleared, and you can now start fresh with your new prestige badge and enhanced daily rewards. Your daily streak has been preserved!`,
            link: `/user/${userId}`
        });

        checkAndAwardAchievements(userId, ['prestige'], { newPrestigeLevel: nextPrestige });

        return json({
            success: true,
            newPrestigeLevel: nextPrestige,
            costPaid: prestigeCost,
            coinsSold: holdings.length,
            totalSaleValue,
            message: `${warningMessage}Congratulations! You've reached Prestige ${nextPrestige}!`
        });
    });
};

export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);

    const [userProfile] = await db
        .select({
            id: user.id,
            name: user.name,
            username: user.username,
            bio: user.bio,
            image: user.image,
            createdAt: user.createdAt,
            baseCurrencyBalance: user.baseCurrencyBalance,
            isAdmin: user.isAdmin,
            loginStreak: user.loginStreak,
            prestigeLevel: user.prestigeLevel
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    if (!userProfile) {
        throw error(404, 'User not found');
    }

    const [portfolioStats] = await db
        .select({
            holdingsCount: sql<number>`COUNT(*)`,
            holdingsValue: sql<number>`COALESCE(SUM(CAST(${userPortfolio.quantity} AS NUMERIC) * CAST(${coin.currentPrice} AS NUMERIC)), 0)`
        })
        .from(userPortfolio)
        .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
        .where(eq(userPortfolio.userId, userId));

    const baseCurrencyBalance = Number(userProfile.baseCurrencyBalance);
    const holdingsValue = Number(portfolioStats?.holdingsValue || 0);
    const holdingsCount = Number(portfolioStats?.holdingsCount || 0);
    const totalPortfolioValue = baseCurrencyBalance + holdingsValue;

    return json({
        profile: {
            ...userProfile,
            baseCurrencyBalance,
            totalPortfolioValue,
            prestigeLevel: userProfile.prestigeLevel || 0
        },
        stats: {
            totalPortfolioValue,
            baseCurrencyBalance,
            holdingsValue,
            holdingsCount,
            coinsCreated: 0,
            totalTransactions: 0,
            totalBuyVolume: 0,
            totalSellVolume: 0,
            transactions24h: 0,
            buyVolume24h: 0,
            sellVolume24h: 0
        }
    });
};
