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
import { incrementMissionProgress } from '$lib/server/missions';

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  try {
    const body = await request.json();
    const { sessionToken } = body ?? {};
    if (!sessionToken || typeof sessionToken !== 'string') {
      return json({ error: 'Missing session token' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const sessionRaw = await redis.get(getSessionKey(sessionToken));
    const game = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (!game) return json({ error: 'Invalid session' }, { status: 400 });
    if (game.userId !== userId) return json({ error: 'Unauthorized' }, { status: 403 });

    const deleted = await redis.del(getSessionKey(sessionToken));
    if (!deleted) return json({ error: 'Session already processed' }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [userData] = await tx
        .select({
          baseCurrencyBalance: user.baseCurrencyBalance,
          arcadeLosses: user.arcadeLosses,
          arcadeWins: user.arcadeWins,
          totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
          arcadeWinStreak: user.arcadeWinStreak,
          arcadeBestWinStreak: user.arcadeBestWinStreak,
          totalArcadeWagered: user.totalArcadeWagered,
        })
        .from(user)
        .where(eq(user.id, userId))
        .for('update')
        .limit(1);

      const currentBalance = Number(userData.baseCurrencyBalance ?? 0);
      const isAbort = (game.revealedTiles ?? []).length === 0;

      if (isAbort) {
        const payout = Number(game.betAmount ?? 0);
        const newBalance = Math.round((currentBalance + payout) * 1e8) / 1e8;
        await tx.update(user).set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() }).where(eq(user.id, userId));
        return { newBalance, payout, amountWagered: game.betAmount, isAbort, minePositions: game.minePositions || [] };
      }

      const payout = Math.round((Number(game.betAmount ?? 0) * Number(game.currentMultiplier ?? 0)) * 1e8) / 1e8;
      const newBalance = Math.round((currentBalance + payout) * 1e8) / 1e8;
      const netResult = Math.round((payout - Number(game.betAmount ?? 0)) * 1e8) / 1e8;
      const isWin = netResult > 0;

      const updateData: any = {
        baseCurrencyBalance: newBalance.toFixed(8),
        updatedAt: new Date(),
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
      updateData.totalArcadeWagered = `${Number(userData.totalArcadeWagered || 0) + Number(game.betAmount ?? 0)}`;

      await tx.update(user).set(updateData).where(eq(user.id, userId));

      return {
        newBalance,
        payout,
        amountWagered: game.betAmount,
        isAbort: false,
        minePositions: game.minePositions || [],
        revealedTiles: game.revealedTiles || [],
        mineCount: game.mineCount || 0,
      };
    });

    if (!result.isAbort) {
      try {
        const won = result.payout > result.amountWagered;
        await publishArcadeActivity(userId, won ? result.payout : result.amountWagered, won, 'mines', 1000);
      } catch (e) {
        console.error('publishArcadeActivity failed:', e);
      }

      try {
        await checkAndAwardAchievements(userId, ['arcade'], {
          arcadeWon: result.payout > result.amountWagered,
          arcadeWager: result.amountWagered,
          minesTilesRevealed: result.revealedTiles?.length ?? 0,
          minesCount: result.mineCount ?? 0,
        });
      } catch (e) {
        console.error('checkAndAwardAchievements failed:', e);
      }

      try {
        const won = result.payout > result.amountWagered;
        const wager = Math.floor(Number(result.amountWagered ?? 0));
        await incrementMissionProgress(userId, 'arcade_play_3');
        await incrementMissionProgress(userId, 'arcade_play_10');
        if (won) {
          await incrementMissionProgress(userId, 'arcade_win_1');
          await incrementMissionProgress(userId, 'arcade_win_3');
          await incrementMissionProgress(userId, 'arcade_win_10');
        }
        await incrementMissionProgress(userId, 'arcade_wager_500', wager);
        await incrementMissionProgress(userId, 'arcade_wager_5000', wager);
      } catch (e) {
        console.error('incrementMissionProgress failed:', e);
      }
    }

    return json(result);
  } catch (e) {
    console.error('Mines cashout error:', e);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};