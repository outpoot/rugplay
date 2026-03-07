import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { publishArcadeActivity } from '$lib/server/arcade-activity';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { validateBetAmount } from '$lib/utils';
import type { RequestHandler } from './$types';
import { incrementMissionProgress } from '$lib/server/missions';

function getRandomSymbol(symbols: string[]): string {
  const idx = Math.floor((randomBytes(1)[0] / 256) * symbols.length);
  return symbols[idx];
}

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  try {
    const body = await request.json();
    const { amount } = body ?? {};
    const roundedBet = validateBetAmount(Number(amount));
    if (!isFinite(roundedBet) || roundedBet <= 0) {
      return json({ error: 'Invalid bet amount' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const symbols = ['bussin', 'lyntr', 'subterfuge', 'twoblade', 'wattesigma', 'webx'];

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
      const roundedBalance = Math.round(currentBalance * 1e8) / 1e8;

      if (roundedBet > roundedBalance) {
        throw new Error(`Insufficient funds. You need $${roundedBet.toFixed(2)} but only have $${roundedBalance.toFixed(2)}`);
      }

      const reels = [
        getRandomSymbol(symbols),
        getRandomSymbol(symbols),
        getRandomSymbol(symbols),
      ];

      let multiplier = 0;
      let winType: string | undefined;

      if (reels[0] === reels[1] && reels[1] === reels[2]) {
        multiplier = 5;
        winType = '3 OF A KIND';
      } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        multiplier = 2;
        winType = '2 OF A KIND';
      }

      const won = multiplier > 0;
      const payout = won ? roundedBet * multiplier : 0;
      const newBalance = Math.round((roundedBalance - roundedBet + payout) * 1e8) / 1e8;
      const netResult = Math.round((payout - roundedBet) * 1e8) / 1e8;
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
      } else {
        updateData.arcadeLosses = `${Number(userData.arcadeLosses || 0) + Math.abs(netResult)}`;
        updateData.arcadeWinStreak = 0;
      }

      updateData.totalArcadeGamesPlayed = (userData.totalArcadeGamesPlayed || 0) + 1;
      updateData.totalArcadeWagered = `${Number(userData.totalArcadeWagered || 0) + roundedBet}`;

      await tx.update(user).set(updateData).where(eq(user.id, userId));

      return { won, symbols: reels, newBalance, payout, amountWagered: roundedBet, winType: won ? winType : undefined };
    });

    try {
      await publishArcadeActivity(userId, result.won ? result.payout : result.amountWagered, result.won, 'slots', 3500);
    } catch (e) {
      console.error('publishArcadeActivity failed:', e);
    }

    try {
      await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: result.won, arcadeWager: result.amountWagered, slotsWinType: result.winType });
    } catch (e) {
      console.error('checkAndAwardAchievements failed:', e);
    }

    try {
      const wager = Math.floor(result.amountWagered);
      await incrementMissionProgress(userId, 'arcade_play_3');
      await incrementMissionProgress(userId, 'arcade_play_10');
      if (result.won) {
        await incrementMissionProgress(userId, 'arcade_win_1');
        await incrementMissionProgress(userId, 'arcade_win_3');
        await incrementMissionProgress(userId, 'arcade_win_10');
      }
      await incrementMissionProgress(userId, 'arcade_wager_500', wager);
      await incrementMissionProgress(userId, 'arcade_wager_5000', wager);
    } catch (e) {
      console.error('incrementMissionProgress failed:', e);
    }

    return json(result);
  } catch (e) {
    console.error('Slots API error:', e);
    if (e instanceof Error && e.message.startsWith('Insufficient funds')) {
      return json({ error: e.message }, { status: 400 });
    }
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};