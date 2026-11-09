import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { claimMinesSession, getSessionKey } from '$lib/server/games/mines';
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
        let game = sessionRaw ? JSON.parse(sessionRaw) : null;

        if (!game) {
            return json({ error: 'Invalid session' }, { status: 400 });
        }

        if (game.userId !== userId) {
            return json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 });
        }

        const result = await db.transaction(async (tx) => {
            const [userData] = await tx
                .select({
                    baseCurrencyBalance: user.baseCurrencyBalance,
                    walletGeneration: user.arcadeWalletGeneration,
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

            if (!userData || !Number.isInteger(game.walletGeneration) || game.walletGeneration < 0 || game.walletGeneration !== userData.walletGeneration) {
                return { expired: true } as const;
            }

            // Refresh the board after acquiring the wallet lock; another move may have completed.
            const currentRaw = await redis.get(getSessionKey(sessionToken));
            if (!currentRaw) return { alreadyProcessed: true } as const;
            game = JSON.parse(currentRaw);
            if (game.userId !== userId) return { unauthorized: true } as const;
            if (!Number.isInteger(game.walletGeneration) || game.walletGeneration < 0 || game.walletGeneration !== userData.walletGeneration) {
                return { expired: true } as const;
            }

            const deleted = await claimMinesSession(sessionToken, game.version);
            if (!deleted) return { alreadyProcessed: true } as const;

            const currentBalance = Number(userData.baseCurrencyBalance);
            const isAbort = game.revealedTiles.length === 0;
            let payout: number;
            let newBalance: number;

            if (isAbort) {
                payout = game.betAmount;
                newBalance = Math.round((currentBalance + payout) * 100000000) / 100000000;

                await tx
                    .update(user)
                    .set({
                        baseCurrencyBalance: newBalance.toFixed(8),
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, userId));

                return { newBalance, payout, amountWagered: game.betAmount, isAbort, minePositions: game.minePositions };
            }

            payout = game.betAmount * game.currentMultiplier;
            const roundedPayout = Math.round(payout * 100000000) / 100000000;
            newBalance = Math.round((currentBalance + roundedPayout) * 100000000) / 100000000;

            // Calculate arcade stats
            const netResult = Math.round((roundedPayout - game.betAmount) * 100000000) / 100000000;
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
                payout: roundedPayout,
                amountWagered: game.betAmount,
                isAbort,
                minePositions: game.minePositions
            };
        });

        if ('expired' in result) {
            return json({ code: 'ROUND_EXPIRED', error: 'This arcade round has expired.' }, { status: 410 });
        }
        if ('alreadyProcessed' in result) {
            return json({ error: 'Session already processed' }, { status: 400 });
        }
        if ('unauthorized' in result) {
            return json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 });
        }

        if (!result.isAbort) {
            try {
                const won = result.payout > result.amountWagered;
                await publishArcadeActivity(userId, won ? result.payout : result.amountWagered, won, 'mines', 1000);
                await checkAndAwardAchievements(userId, ['arcade'], { arcadeWon: won, arcadeWager: result.amountWagered, minesTilesRevealed: game.revealedTiles.length, minesCount: game.mineCount });
            } catch (sideEffectError) {
                console.error('Mines cashout side-effect error:', sideEffectError);
            }
        }

        return json(result);
    } catch (e) {
        console.error('Mines cashout error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
