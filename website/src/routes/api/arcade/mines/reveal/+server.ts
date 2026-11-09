import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { calculateMultiplier, claimMinesSession, getSessionKey } from '$lib/server/games/mines';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	try {
		const { sessionToken, tileIndex } = await request.json();
		if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex > 24) {
			return json({ error: 'Invalid tileIndex' }, { status: 400 });
		}
		const userId = Number(session.user.id);
		const sessionRaw = await redis.get(getSessionKey(sessionToken));
		const originalGame = sessionRaw ? JSON.parse(sessionRaw) : null;
		if (!originalGame) return json({ error: 'Invalid session' }, { status: 400 });
		if (originalGame.userId !== userId) {
			return json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 });
		}

		const result = await db.transaction(async (tx) => {
			const [userData] = await tx.select({
				baseCurrencyBalance: user.baseCurrencyBalance,
				walletGeneration: user.arcadeWalletGeneration,
				arcadeLosses: user.arcadeLosses,
				arcadeWins: user.arcadeWins,
				totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
				arcadeWinStreak: user.arcadeWinStreak,
				arcadeBestWinStreak: user.arcadeBestWinStreak,
				totalArcadeWagered: user.totalArcadeWagered
			}).from(user).where(eq(user.id, userId)).for('update').limit(1);

			if (!userData || !Number.isInteger(originalGame.walletGeneration) ||
				originalGame.walletGeneration < 0 || originalGame.walletGeneration !== userData.walletGeneration) {
				return { response: json({ code: 'ROUND_EXPIRED', error: 'This arcade round has expired.' }, { status: 410 }) };
			}
			// Reload under the wallet lock so concurrent moves cannot use an earlier board.
			const currentRaw = await redis.get(getSessionKey(sessionToken));
			if (!currentRaw) return { response: json({ error: 'Invalid session' }, { status: 400 }) };
			const game = JSON.parse(currentRaw);
			if (game.userId !== userId) return { response: json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 }) };
			if (!Number.isInteger(game.walletGeneration) || game.walletGeneration < 0 || game.walletGeneration !== userData.walletGeneration) {
				return { response: json({ code: 'ROUND_EXPIRED', error: 'This arcade round has expired.' }, { status: 410 }) };
			}
			if (game.status !== 'active') return { response: json({ error: 'Game is not active' }, { status: 400 }) };
			if (game.revealedTiles.includes(tileIndex)) return { response: json({ error: 'Tile already revealed' }, { status: 400 }) };

			game.lastActivity = Date.now();
			if (game.minePositions.includes(tileIndex)) {
				if (!(await claimMinesSession(sessionToken, game.version))) return { response: json({ error: 'Invalid session' }, { status: 400 }) };
				await tx.update(user).set({
					arcadeLosses: `${Number(userData.arcadeLosses || 0) + game.betAmount}`,
					arcadeWinStreak: 0,
					totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
					totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + game.betAmount}`,
					updatedAt: new Date()
				}).where(eq(user.id, userId));
				return {
					response: json({ hitMine: true, minePositions: game.minePositions, newBalance: Number(userData.baseCurrencyBalance), status: 'lost', amountWagered: game.betAmount }),
					achievement: { arcadeWon: false, arcadeWager: game.betAmount }
				};
			}

			game.revealedTiles.push(tileIndex);
			game.currentMultiplier = calculateMultiplier(game.revealedTiles.length, game.mineCount, game.betAmount);
			if (game.revealedTiles.length === 25 - game.mineCount) {
				if (!(await claimMinesSession(sessionToken, game.version))) return { response: json({ error: 'Invalid session' }, { status: 400 }) };
				const payout = game.betAmount * game.currentMultiplier;
				const roundedPayout = Math.round(payout * 100000000) / 100000000;
				const balance = Math.round((Number(userData.baseCurrencyBalance) + roundedPayout) * 100000000) / 100000000;
				const newWinStreak = (userData.arcadeWinStreak || 0) + 1;
				await tx.update(user).set({
					baseCurrencyBalance: balance.toFixed(8),
					arcadeWins: `${Number(userData.arcadeWins || 0) + roundedPayout - game.betAmount}`,
					arcadeWinStreak: newWinStreak,
					arcadeBestWinStreak: Math.max(newWinStreak, userData.arcadeBestWinStreak || 0),
					totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
					totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + game.betAmount}`,
					updatedAt: new Date()
				}).where(eq(user.id, userId));
				return {
					response: json({ hitMine: false, currentMultiplier: game.currentMultiplier, status: 'won', newBalance: balance, payout, minePositions: game.minePositions }),
					achievement: { arcadeWon: true, arcadeWager: game.betAmount, minesTilesRevealed: game.revealedTiles.length, minesCount: game.mineCount }
				};
			}

			const expectedVersion = game.version || 0;
			game.version = expectedVersion + 1;
			const updated = await redis.eval(`
				local current = redis.call("get", KEYS[1])
				if not current then return 0 end
				local state = cjson.decode(current)
				if (state.version or 0) ~= tonumber(ARGV[2]) then return 0 end
				redis.call("set", KEYS[1], ARGV[1])
				return 1
			`, { keys: [getSessionKey(sessionToken)], arguments: [JSON.stringify(game), String(expectedVersion)] });
			if (!updated) return { response: json({ error: 'Session was modified or removed' }, { status: 400 }) };
			return { response: json({ hitMine: false, currentMultiplier: game.currentMultiplier, status: game.status }) };
		});
		if (result.achievement) {
			try {
				await checkAndAwardAchievements(userId, ['arcade', 'wealth'], result.achievement);
			} catch (sideEffectError) {
				console.error('Mines reveal side-effect error:', sideEffectError);
			}
		}
		return result.response;
	} catch (e) {
		console.error('Mines reveal error:', e);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
