import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { calculateMultiplier } from '$lib/server/games/mines';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey } from '$lib/server/games/mines';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const { sessionToken, tileIndex } = await request.json();

		if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex > 24) {
			return json({ error: 'Invalid tileIndex' }, { status: 400 });
		}

		const sessionRaw = await redis.get(getSessionKey(sessionToken));
		const game = sessionRaw ? JSON.parse(sessionRaw) : null;
		const userId = Number(session.user.id);

		if (!game) {
			return json({ error: 'Invalid session' }, { status: 400 });
		}

		if (game.userId !== userId) {
			return json({ error: 'Unauthorized: Session belongs to another user' }, { status: 403 });
		}

		if (game.status !== 'active') {
			return json({ error: 'Game is not active' }, { status: 400 });
		}

		if (game.revealedTiles.includes(tileIndex)) {
			return json({ error: 'Tile already revealed' }, { status: 400 });
		}

		game.lastActivity = Date.now();

		if (game.minePositions.includes(tileIndex)) {
			game.status = 'lost';
			const minePositions = game.minePositions;

			const deleted = await redis.del(getSessionKey(sessionToken));

			if (!deleted) {
				return json({ error: 'Session already processed' }, { status: 400 });
			}

			const currentBalance = await db.transaction(async (tx) => {
				const [userData] = await tx
					.select({
						baseCurrencyBalance: user.baseCurrencyBalance,
						arcadeLosses: user.arcadeLosses,
						totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
						arcadeWinStreak: user.arcadeWinStreak,
						totalArcadeWagered: user.totalArcadeWagered
					})
					.from(user)
					.where(eq(user.id, userId))
					.for('update')
					.limit(1);

				if (!userData) {
					throw new Error('User not found');
				}

				const balance = Number(userData.baseCurrencyBalance);

				await tx
					.update(user)
					.set({
						baseCurrencyBalance: balance.toFixed(8),
						arcadeLosses: `${Number(userData.arcadeLosses || 0) + game.betAmount}`,
						arcadeWinStreak: 0,
						totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
						totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + game.betAmount}`,
						updatedAt: new Date()
					})
					.where(eq(user.id, userId));

				return balance;
			});

			await checkAndAwardAchievements(userId, ['arcade', 'wealth'], {
				arcadeWon: false,
				arcadeWager: game.betAmount
			});

			return json({
				hitMine: true,
				minePositions,
				newBalance: currentBalance,
				status: 'lost',
				amountWagered: game.betAmount
			});
		}

		// Safe tile
		game.revealedTiles.push(tileIndex);
		game.currentMultiplier = calculateMultiplier(
			game.revealedTiles.length,
			game.mineCount,
			game.betAmount
		);

		if (game.revealedTiles.length === 25 - game.mineCount) {
			game.status = 'won';

			const deleted = await redis.del(getSessionKey(sessionToken));

			if (!deleted) {
				return json({ error: 'Session already processed' }, { status: 400 });
			}

			const payout = game.betAmount * game.currentMultiplier;
			const roundedPayout = Math.round(payout * 100000000) / 100000000;

			const newBalance = await db.transaction(async (tx) => {
				const [userData] = await tx
					.select({
						baseCurrencyBalance: user.baseCurrencyBalance,
						arcadeWins: user.arcadeWins,
						arcadeWinStreak: user.arcadeWinStreak,
						arcadeBestWinStreak: user.arcadeBestWinStreak,
						totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
						totalArcadeWagered: user.totalArcadeWagered
					})
					.from(user)
					.where(eq(user.id, userId))
					.for('update')
					.limit(1);

				if (!userData) {
					throw new Error('User not found');
				}

				const currentBalance = Number(userData.baseCurrencyBalance);
				const balance = Math.round((currentBalance + roundedPayout) * 100000000) / 100000000;
				const netResult = roundedPayout - game.betAmount;
				const newWinStreak = (userData.arcadeWinStreak || 0) + 1;

				await tx
					.update(user)
					.set({
						baseCurrencyBalance: balance.toFixed(8),
						arcadeWins: `${Number(userData.arcadeWins || 0) + netResult}`,
						arcadeWinStreak: newWinStreak,
						arcadeBestWinStreak: Math.max(newWinStreak, userData.arcadeBestWinStreak || 0),
						totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
						totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + game.betAmount}`,
						updatedAt: new Date()
					})
					.where(eq(user.id, userId));

				return balance;
			});

			await checkAndAwardAchievements(userId, ['arcade', 'wealth'], {
				arcadeWon: true,
				arcadeWager: game.betAmount,
				minesTilesRevealed: game.revealedTiles.length,
				minesCount: game.mineCount
			});

			return json({
				hitMine: false,
				currentMultiplier: game.currentMultiplier,
				status: 'won',
				newBalance,
				payout
			});
		}

		const luaScript = `
            local current = redis.call("get", KEYS[1])
            if current then
                local state = cjson.decode(current)
                local ver = state.version or 0
                if ver == tonumber(ARGV[2]) then
                    redis.call("set", KEYS[1], ARGV[1])
                    return 1
                else
                    return 0
                end
            else
                return 0
            end
        `;

		const expectedVersion = game.version || 0;
		game.version = expectedVersion + 1;

		const updated = (await redis.eval(luaScript, {
			keys: [getSessionKey(sessionToken)],
			arguments: [JSON.stringify(game), String(expectedVersion)]
		})) as number;

		if (!updated) {
			return json({ error: 'Session was modified or removed' }, { status: 400 });
		}

		return json({
			hitMine: false,
			currentMultiplier: game.currentMultiplier,
			status: game.status
		});
	} catch (e) {
		console.error('Mines reveal error:', e);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
