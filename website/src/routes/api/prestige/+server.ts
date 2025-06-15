import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userPortfolio, transaction, notifications, coin } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { formatValue, getPrestigeCost, getPrestigeName } from '$lib/utils';

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

        const holdings = await tx
            .select({
                coinId: userPortfolio.coinId,
                quantity: userPortfolio.quantity,
                currentPrice: coin.currentPrice,
                symbol: coin.symbol
            })
            .from(userPortfolio)
            .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
            .where(eq(userPortfolio.userId, userId));

        let warningMessage = '';
        let totalSaleValue = 0;

        if (holdings.length > 0) {
            warningMessage = `All ${holdings.length} coin holdings have been sold at current market prices. `;

            for (const holding of holdings) {
                const quantity = Number(holding.quantity);
                const price = Number(holding.currentPrice);
                const saleValue = quantity * price;
                totalSaleValue += saleValue;

                await tx.insert(transaction).values({
                    coinId: holding.coinId!,
                    type: 'SELL',
                    quantity: holding.quantity,
                    pricePerCoin: holding.currentPrice || '0',
                    totalBaseCurrencyAmount: saleValue.toString(),
                    timestamp: new Date()
                });
            }

            await tx
                .delete(userPortfolio)
                .where(eq(userPortfolio.userId, userId));
        }

        const currentBalance = Number(userData.baseCurrencyBalance) + totalSaleValue;
        if (currentBalance < prestigeCost) {
            throw error(400, `Insufficient funds. Need ${formatValue(prestigeCost)}, have ${formatValue(currentBalance)}`);
        }

        await tx
            .update(user)
            .set({
                baseCurrencyBalance: '100.00000000',
                prestigeLevel: nextPrestige,
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        await tx.delete(userPortfolio).where(eq(userPortfolio.userId, userId));

        await tx.insert(notifications).values({
            userId: userId,
            type: 'SYSTEM',
            title: `${prestigeName} Achieved!`,
            message: `Congratulations! You have successfully reached ${prestigeName}. Your portfolio has been reset and you can now start fresh with your new prestige badge.`,
        });

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
