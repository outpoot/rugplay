import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';
import { publishArcadeActivity } from '$lib/server/arcade-activity';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { sessionToken } = await request.json();
        const userId = Number(session.user.id);

        const sessionRaw = await redis.get(getSessionKey(sessionToken));
        const game = sessionRaw ? JSON.parse(sessionRaw) : null;

        if (!game) {
            return json({ error: 'Invalid session' }, { status: 400 });
        }

        if (game.userId !== userId) {
            return json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 });
        }

        const deleted = await redis.del(getSessionKey(sessionToken));

        if (!deleted) {
            return json({ error: 'Session already processed' }, { status: 400 });
        }

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({
                    baseCurrencyBalance: user.baseCurrencyBalance,
                    arcadeLosses: user.arcadeLosses,
                    arcadeWins: user.arcadeWins,
                    totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
                    arcadeWinStreak: user.arcadeWinStreak,
                    arcadeBestWinStreak: user.arcadeBestWinStreak,
                    totalArcadeWagered: user.totalArcadeWagered
                })
                .from(user)
                .where(eq(user.id, userId))
                .for('update')
                .limit(1);

            const currentBalance = Number(userData.baseCurrencyBalance);
            let payout: number;
            let newBalance: number;

            // If no tiles revealed, treat as abort and return full bet.
            if (game.revealedTiles.length === 0) {
                payout = game.betAmount;
                newBalance = Math.round((currentBalance + payout) * 100000000) / 100000000;
            } else {
                payout = game.betAmount * game.currentMultiplier;
                const roundedPayout = Math.round(payout * 100000000) / 100000000;
                newBalance = Math.round((currentBalance + roundedPayout) * 100000000) / 100000000;
            }

            // Calculate arcade stats
            const netResult = payout - game.betAmount;
            const isWin = netResult > 0;

            const updateData: any = {
                baseCurrencyBalance: newBalance.toFixed(8),
                updatedAt: new Date()
            };

            if (isWin) {
                updateData.arcadeWins = `${Number(userData.arcadeWins || 0) + netResult}`;
                const newWinStreak = (userData.arcadeWinStreak || 0) + 1;
                updateData.arcadeWinStreak = newWinStreak;
                updateData.arcadeBestWinStreak = Math.max(newWinStreak, userData.arcadeBestWinStreak || 0);
            } else if (netResult < 0) {
                updateData.arcadeLosses = `${Number(userData.arcadeLosses || 0) + Math.abs(netResult)}`;
                updateData.arcadeWinStreak = 0;
            }
            updateData.totalArcadeGamesPlayed = (userData.totalArcadeGamesPlayed || 0) + 1;
            updateData.totalArcadeWagered = `${Number(userData.totalArcadeWagered || 0) + game.betAmount}`;

            await tx
                .update(user)
                .set(updateData)
                .where(eq(user.id, userId));


            return {
                newBalance,
                payout,
                amountWagered: game.betAmount,
                isAbort: game.revealedTiles.length === 0,
                minePositions: game.minePositions
            };
        });

        const won = !result.isAbort && result.payout > result.amountWagered;
        await publishArcadeActivity(userId, won ? result.payout : result.amountWagered, won, 'mines', 1000);

        await checkAndAwardAchievements(userId, ['arcade'], { arcadeWon: won, arcadeWager: result.amountWagered, minesTilesRevealed: game.revealedTiles.length });

        return json(result);
    } catch (e) {
        console.error('Mines cashout error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};