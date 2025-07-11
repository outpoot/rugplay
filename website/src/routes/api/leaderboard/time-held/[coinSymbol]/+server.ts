import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, transaction, user, userPortfolio } from '$lib/server/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const coinSymbol = params.coinSymbol?.toUpperCase();
    if (!coinSymbol) {
        throw error(400, 'Coin symbol is required');
    }

    try {
        const [coinData] = await db
            .select({ id: coin.id })
            .from(coin)
            .where(eq(coin.symbol, coinSymbol))
            .limit(1);

        if (!coinData) {
            throw error(404, 'Coin not found');
        }

        // 1. Get all users who currently hold a positive quantity of this coin
        const currentHolders = await db
            .select({ userId: user.id, username: user.username })
            .from(user)
            .innerJoin(userPortfolio, and(
                eq(user.id, userPortfolio.userId),
                eq(userPortfolio.coinId, coinData.id),
                sql`${userPortfolio.quantity} > 0` // Ensure they actually hold some quantity
            ));

        if (currentHolders.length === 0) {
            return json([]); // No current holders, empty leaderboard
        }

        const holderUserIds = currentHolders.map(h => h.userId);
        const holderUsernames = new Map(currentHolders.map(h => [h.userId, h.username]));

        // 2. Fetch all BUY and SELL transactions for these specific users and this coin
        // Order chronologically for accurate balance simulation
        const allRelevantTransactions = await db
            .select({
                userId: transaction.userId,
                type: transaction.type,
                quantity: transaction.quantity,
                timestamp: transaction.timestamp,
            })
            .from(transaction)
            .where(and(
                eq(transaction.coinId, coinData.id),
                sql`${transaction.userId} IN (${sql.join(holderUserIds, sql`,`)})`,
                sql`${transaction.type} IN ('BUY', 'SELL')` // Only relevant types
            ))
            .orderBy(asc(transaction.timestamp)); // Crucial for chronological processing

        // 3. Application-level processing to determine holding start times
        const userHoldingStates = new Map<
            number,
            { currentSimulatedQuantity: number; currentHoldingStartTime: Date | null }
        >();

        // Initialize all current holders
        holderUserIds.forEach(userId => {
            userHoldingStates.set(userId, { currentSimulatedQuantity: 0, currentHoldingStartTime: null });
        });

        // Iterate through transactions chronologically for all relevant users
        for (const tx of allRelevantTransactions) {
            const userId = tx.userId!;
            const state = userHoldingStates.get(userId);
            if (!state) continue; // Should not happen if user is a current holder

            const txQuantity = Number(tx.quantity);

            if (tx.type === 'BUY') {
                // If there's no current holding start time (either first buy or after a sell broke continuity)
                if (state.currentHoldingStartTime === null) {
                    state.currentHoldingStartTime = tx.timestamp; // This BUY starts a new holding period
                }
                state.currentSimulatedQuantity += txQuantity;
            } else if (tx.type === 'SELL') {
                state.currentSimulatedQuantity -= txQuantity;

                if (state.currentSimulatedQuantity <= 0) {
                    // If selling to zero or below, clear holding start time
                    state.currentSimulatedQuantity = 0; // Ensure non-negative quantity
                    state.currentHoldingStartTime = null;
                } else {
                    // Partial sell: Reset holding time to null.
                    // The next BUY will then establish a new holding start time.
                    state.currentHoldingStartTime = null; 
                }
            }
            // Update the map with the latest state (this is implicit as `state` is a reference)
        }

        // 4. Filter for valid holding times and format for the leaderboard
        const leaderboardEntries = Array.from(userHoldingStates.entries())
            .filter(([, state]) => state.currentHoldingStartTime !== null) // Only include users with an active holding start time
            .map(([userId, state]) => ({
                userId: userId,
                username: holderUsernames.get(userId), // Get username from pre-fetched map
                buyTimestamp: state.currentHoldingStartTime!.getTime(), // Convert to milliseconds timestamp
            }));

        // 5. Sort by buyTimestamp ascending (oldest first) to rank longest holders
        leaderboardEntries.sort((a, b) => a.buyTimestamp - b.buyTimestamp);

        return json(leaderboardEntries);

    } catch (e) {
        console.error('SERVER ERROR in /api/leaderboard/time-held/[coinSymbol]:', e);
        throw error(500, 'Internal server error processing holding time leaderboard. Check server logs for details.');
    }
};