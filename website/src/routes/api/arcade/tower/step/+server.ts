import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getSessionKey, twr_floors, type TowerSession } from '$lib/server/games/tower';
import { calculateTowerMultiplier, twr_difficulty_config, type TowerDifficulty } from '$lib/utils';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const { sessionToken, tileIndex } = await request.json();
        const userId = Number(session.user.id);

        const raw = await redis.get(getSessionKey(sessionToken));
        const game = raw ? (JSON.parse(raw) as TowerSession) : null;

        if (!game) return json({ error: 'Invalid session' }, { status: 400 });
        if (game.userId !== userId) return json({ error: 'Unauthorized' }, { status: 403 });
        if (game.status !== 'active') return json({ error: 'Game is not active' }, { status: 400 });

        const config = twr_difficulty_config[game.difficulty];

        if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= config.tiles) {
            return json({ error: 'Invalid tile index' }, { status: 400 });
        }

        game.lastActivity = Date.now();

        if (game.floorBombPositions[game.currentFloor].includes(tileIndex)) {
            const bombs = game.floorBombPositions;

            const deleted = await redis.del(getSessionKey(sessionToken));
            if (!deleted) return json({ error: 'Session already processed' }, { status: 400 });

            const balance = await db.transaction(async (tx) => {
                const [row] = await tx
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

                if (!row) throw new Error('User not found');

                await tx.update(user).set({
                    baseCurrencyBalance: Number(row.baseCurrencyBalance).toFixed(8),
                    arcadeLosses: `${Number(row.arcadeLosses || 0) + game.betAmount}`,
                    arcadeWinStreak: 0,
                    totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
                    totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + game.betAmount}`,
                    updatedAt: new Date()
                }).where(eq(user.id, userId));

                return Number(row.baseCurrencyBalance);
            });

            await checkAndAwardAchievements(userId, ['arcade', 'wealth'], {
                arcadeWon: false,
                arcadeWager: game.betAmount
            });

            return json({ hitBomb: true, allBombPositions: bombs, newBalance: balance, status: 'lost', amountWagered: game.betAmount });
        }

        game.currentFloor += 1;
        game.currentMultiplier = calculateTowerMultiplier(game.currentFloor, game.difficulty as TowerDifficulty);

        if (game.currentFloor >= twr_floors) {
            const bombs = game.floorBombPositions;

            const deleted = await redis.del(getSessionKey(sessionToken));
            if (!deleted) return json({ error: 'Session already processed' }, { status: 400 });

            const payout = Math.round(game.betAmount * game.currentMultiplier * 100000000) / 100000000;

            const newBalance = await db.transaction(async (tx) => {
                const [row] = await tx
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

                if (!row) throw new Error('User not found');

                const bal = Number(row.baseCurrencyBalance);
                const newBal = Math.round((bal + payout) * 100000000) / 100000000;
                const streak = (row.arcadeWinStreak || 0) + 1;

                await tx.update(user).set({
                    baseCurrencyBalance: newBal.toFixed(8),
                    arcadeWins: `${Number(row.arcadeWins || 0) + (payout - game.betAmount)}`,
                    arcadeWinStreak: streak,
                    arcadeBestWinStreak: Math.max(streak, row.arcadeBestWinStreak || 0),
                    totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
                    totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + game.betAmount}`,
                    updatedAt: new Date()
                }).where(eq(user.id, userId));

                return newBal;
            });

            await checkAndAwardAchievements(userId, ['arcade', 'wealth'], {
                arcadeWon: true,
                arcadeWager: game.betAmount
            });

            return json({ hitBomb: false, currentFloor: game.currentFloor, currentMultiplier: game.currentMultiplier, status: 'won', newBalance, payout, allBombPositions: bombs });
        }

        const lua = `
            local cur = redis.call("get", KEYS[1])
            if cur then
                local s = cjson.decode(cur)
                if (s.version or 0) == tonumber(ARGV[2]) then
                    redis.call("set", KEYS[1], ARGV[1])
                    return 1
                end
                return 0
            end
            return 0
        `;

        const ver = game.version || 0;
        game.version = ver + 1;

        const updated = (await redis.eval(lua, {
            keys: [getSessionKey(sessionToken)],
            arguments: [JSON.stringify(game), String(ver)]
        })) as number;

        if (!updated) return json({ error: 'Session was modified or removed' }, { status: 400 });

        return json({ hitBomb: false, currentFloor: game.currentFloor, currentMultiplier: game.currentMultiplier, status: game.status });
    } catch (e) {
        console.error('Tower step error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};