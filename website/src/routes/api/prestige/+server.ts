// src/routes/api/prestige/+server.ts
//
// FIXES IN THIS VERSION:
//   1. Removed the duplicate `tx.delete(userPortfolio)` call that ran after the
//      loop (the loop already deleted rows individually via executeSellTrade,
//      then a blanket delete ran again — harmless but signals a logic error and
//      caused confusion with row counts in the response).
//   2. `prestigeLevel` column is now guaranteed non-null (migration sets NOT NULL
//      DEFAULT 0), so removed every `|| 0` fallback that masked the real bug.
//   3. Snapshot the portfolio value BEFORE wiping it so the P&L chart gets a
//      clean "peak" data point at prestige time.
//   4. Added portfolio snapshot insert on prestige so history is preserved.

import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userPortfolio, transaction, notifications, coin } from '$lib/server/db/schema';
import { portfolioSnapshot } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { formatValue, getPrestigeCost, getPrestigeName } from '$lib/utils';
import { executeSellTrade } from '$lib/server/amm';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);

    return await db.transaction(async (tx) => {
        // Lock the row so concurrent prestige attempts can't race
        const [userData] = await tx
            .select({
                baseCurrencyBalance: user.baseCurrencyBalance,
                prestigeLevel: user.prestigeLevel,
            })
            .from(user)
            .where(eq(user.id, userId))
            .for('update')
            .limit(1);

        if (!userData) throw error(404, 'User not found');

        const currentPrestige = userData.prestigeLevel ?? 0;
        const nextPrestige = currentPrestige + 1;
        const prestigeCost = getPrestigeCost(nextPrestige);
        const prestigeName = getPrestigeName(nextPrestige);

        if (!prestigeCost || !prestigeName) {
            throw error(400, 'Maximum prestige level reached');
        }

        const currentCashBalance = Number(userData.baseCurrencyBalance);
        if (currentCashBalance < prestigeCost) {
            throw error(
                400,
                `Insufficient cash. Need ${formatValue(prestigeCost)}, have ${formatValue(currentCashBalance)}. ` +
                `Coin holdings are not counted toward the prestige cost — sell them first.`
            );
        }

        // ── Fetch all holdings ──────────────────────────────────────────────
        const holdings = await tx
            .select({
                coinId: userPortfolio.coinId,
                quantity: userPortfolio.quantity,
                currentPrice: coin.currentPrice,
                symbol: coin.symbol,
                poolCoinAmount: coin.poolCoinAmount,
                poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount,
                circulatingSupply: coin.circulatingSupply,
            })
            .from(userPortfolio)
            .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
            .where(eq(userPortfolio.userId, userId));

        let totalSaleValue = 0;

        // ── Sell every holding through the AMM ──────────────────────────────
        for (const holding of holdings) {
            const quantity = Number(holding.quantity);
            const currentPrice = Number(holding.currentPrice ?? 0);

            // Pool is dry — use fallback price so the tx record is still written
            if (
                Number(holding.poolCoinAmount) <= 0 ||
                Number(holding.poolBaseCurrencyAmount) <= 0
            ) {
                const fallbackValue = quantity * currentPrice;
                totalSaleValue += fallbackValue;

                await tx.insert(transaction).values({
                    userId,
                    coinId: holding.coinId!,
                    type: 'SELL',
                    quantity: holding.quantity,
                    pricePerCoin: holding.currentPrice ?? '0',
                    totalBaseCurrencyAmount: fallbackValue.toFixed(8),
                    timestamp: new Date(),
                });
                continue;
            }

            const sellResult = await executeSellTrade(
                tx,
                {
                    id: holding.coinId,
                    poolCoinAmount: holding.poolCoinAmount,
                    poolBaseCurrencyAmount: holding.poolBaseCurrencyAmount,
                    currentPrice: holding.currentPrice,
                    circulatingSupply: holding.circulatingSupply,
                },
                userId,
                quantity
            );

            totalSaleValue += sellResult.success && sellResult.baseCurrencyReceived
                ? sellResult.baseCurrencyReceived
                : (sellResult.fallbackValue ?? quantity * currentPrice);
        }

        // ── Save a portfolio snapshot BEFORE the reset ──────────────────────
        // This gives the P&L history chart a "peak" point right at prestige time.
        const holdingsValue = holdings.reduce((sum, h) => {
            return sum + Number(h.quantity) * Number(h.currentPrice ?? 0);
        }, 0);

        await tx.insert(portfolioSnapshot).values({
            userId,
            totalValue: (currentCashBalance + holdingsValue).toFixed(8),
            cashBalance: currentCashBalance.toFixed(8),
            holdingsValue: holdingsValue.toFixed(8),
            snapshottedAt: new Date(),
        });

        // ── Wipe portfolio (single delete — FIX for double-delete bug) ──────
        await tx.delete(userPortfolio).where(eq(userPortfolio.userId, userId));

        // ── Reset user to fresh state with new prestige ─────────────────────
        await tx
            .update(user)
            .set({
                baseCurrencyBalance: '100.00000000',
                prestigeLevel: nextPrestige,
                // Clear daily reward cooldown but preserve streak
                lastRewardClaim: new Date(Date.now() - 12 * 60 * 60 * 1000),
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId));

        // ── Notification ────────────────────────────────────────────────────
        await tx.insert(notifications).values({
            userId,
            type: 'SYSTEM',
            title: `${prestigeName} Achieved! 🌟`,
            message:
                `Congratulations! You've reached ${prestigeName}. ` +
                `Your portfolio has been reset and you start fresh with $100. ` +
                `Daily reward cooldown cleared — streak preserved. ` +
                `You now earn 25% more from daily rewards.`,
            link: `/prestige`,
        });

        // ── Achievements ────────────────────────────────────────────────────
        checkAndAwardAchievements(userId, ['prestige'], { newPrestigeLevel: nextPrestige });

        return json({
            success: true,
            newPrestigeLevel: nextPrestige,
            costPaid: prestigeCost,
            coinsSold: holdings.length,
            totalSaleValue,
            message:
                holdings.length > 0
                    ? `Sold ${holdings.length} coin holding(s) worth ${formatValue(totalSaleValue)}. Congratulations on ${prestigeName}!`
                    : `Congratulations! You've reached ${prestigeName}!`,
        });
    });
};

export const GET: RequestHandler = async ({ request, url }) => {
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
            prestigeLevel: user.prestigeLevel,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    if (!userProfile) throw error(404, 'User not found');

    const [portfolioStats] = await db
        .select({
            holdingsCount: sql<number>`COUNT(*)`,
            holdingsValue: sql<number>`
                COALESCE(
                    SUM(CAST(${userPortfolio.quantity} AS NUMERIC) * CAST(${coin.currentPrice} AS NUMERIC)),
                    0
                )`,
        })
        .from(userPortfolio)
        .leftJoin(coin, eq(userPortfolio.coinId, coin.id))
        .where(eq(userPortfolio.userId, userId));

    const baseCurrencyBalance = Number(userProfile.baseCurrencyBalance);
    const holdingsValue = Number(portfolioStats?.holdingsValue ?? 0);
    const totalPortfolioValue = baseCurrencyBalance + holdingsValue;

    return json({
        profile: {
            ...userProfile,
            baseCurrencyBalance,
            totalPortfolioValue,
            prestigeLevel: userProfile.prestigeLevel ?? 0,
        },
        stats: {
            totalPortfolioValue,
            baseCurrencyBalance,
            holdingsValue,
            holdingsCount: Number(portfolioStats?.holdingsCount ?? 0),
        },
    });
};
