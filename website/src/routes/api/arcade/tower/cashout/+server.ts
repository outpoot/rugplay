import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey, type TowerSession } from '$lib/server/games/tower';
import { publishArcadeActivity } from '$lib/server/arcade-activity';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const { sessionToken } = await request.json();
        const userId = Number(session.user.id);

        const raw = await redis.get(getSessionKey(sessionToken));
        const game = raw ? (JSON.parse(raw) as TowerSession) : null;

        if (!game) return json({ error: 'Invalid session' }, { status: 400 });
        if (game.userId !== userId) return json({ error: 'Unauthorized' }, { status: 403 });

        const deleted = await redis.del(getSessionKey(sessionToken));
        if (!deleted) return json({ error: 'Session already processed' }, { status: 400 });

        const result = await db.transaction(async (tx) => {
            const [row] = await tx
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

            const bal = Number(row.baseCurrencyBalance);
            const isAbort = game.currentFloor === 0;

            if (isAbort) {
                const newBal = Math.round((bal + game.betAmount) * 100000000) / 100000000;
                await tx.update(user).set({ baseCurrencyBalance: newBal.toFixed(8), updatedAt: new Date() }).where(eq(user.id, userId));
                return { newBalance: newBal, payout: game.betAmount, amountWagered: game.betAmount, isAbort, allBombPositions: game.floorBombPositions };
            }

            const payout = Math.round(game.betAmount * game.currentMultiplier * 100000000) / 100000000;
            const newBal = Math.round((bal + payout) * 100000000) / 100000000;
            const net = Math.round((payout - game.betAmount) * 100000000) / 100000000;
            const won = net > 0;

            const update: Record<string, unknown> = {
                baseCurrencyBalance: newBal.toFixed(8),
                totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
                totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + game.betAmount}`,
                updatedAt: new Date()
            };

            if (won) {
                update.arcadeWins = `${Number(row.arcadeWins || 0) + net}`;
                const streak = (row.arcadeWinStreak || 0) + 1;
                update.arcadeWinStreak = streak;
                update.arcadeBestWinStreak = Math.max(streak, row.arcadeBestWinStreak || 0);
            } else if (net < 0) {
                update.arcadeLosses = `${Number(row.arcadeLosses || 0) + Math.abs(net)}`;
                update.arcadeWinStreak = 0;
            }

            await tx.update(user).set(update).where(eq(user.id, userId));
            return { newBalance: newBal, payout, amountWagered: game.betAmount, isAbort, allBombPositions: game.floorBombPositions };
        });

        if (!result.isAbort) {
            try {
                const won = result.payout > result.amountWagered;
                await publishArcadeActivity(userId, won ? result.payout : result.amountWagered, won, 'tower', 1000);
                await checkAndAwardAchievements(userId, ['arcade'], { arcadeWon: won, arcadeWager: result.amountWagered });
            } catch (e) {
                console.error('Tower cashout side-effect error:', e);
            }
        }

        return json(result);
    } catch (e) {
        console.error('Tower cashout error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};