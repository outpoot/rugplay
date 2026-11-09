import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { claimTowerSession, getSessionKey, twr_floors, type TowerSession } from '$lib/server/games/tower';
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
        const snapshot = raw ? (JSON.parse(raw) as TowerSession) : null;

        if (!snapshot) return json({ code: 'ROUND_NOT_FOUND', error: 'Invalid session' }, { status: 400 });
        if (snapshot.userId !== userId) return json({ error: 'Unauthorized' }, { status: 403 });

        // Hold the same row lock as ranked entry through both the Redis move and any settlement.
        const result = await db.transaction(async (tx) => {
            const [row] = await tx.select({
                baseCurrencyBalance: user.baseCurrencyBalance,
                arcadeWalletGeneration: user.arcadeWalletGeneration,
                arcadeLosses: user.arcadeLosses,
                arcadeWins: user.arcadeWins,
                arcadeWinStreak: user.arcadeWinStreak,
                arcadeBestWinStreak: user.arcadeBestWinStreak,
                totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
                totalArcadeWagered: user.totalArcadeWagered
            }).from(user).where(eq(user.id, userId)).for('update').limit(1);

            if (!row) throw new Error('User not found');
            const currentRaw = await redis.get(getSessionKey(sessionToken));
            if (!currentRaw) return { response: json({ code: 'ROUND_NOT_FOUND', error: 'Session already processed' }, { status: 400 }) };
            const game = JSON.parse(currentRaw) as TowerSession;
            if (game.userId !== userId) return { response: json({ error: 'Unauthorized' }, { status: 403 }) };
            if (!Number.isInteger(game.walletGeneration) || game.walletGeneration < 0 || game.walletGeneration !== row.arcadeWalletGeneration) {
                return { response: json({ code: 'ROUND_EXPIRED', error: 'This arcade round has expired.' }, { status: 410 }) };
            }
            if (game.version !== snapshot.version) return { response: json({ error: 'Session was modified' }, { status: 409 }) };
            if (game.status !== 'active') return { response: json({ error: 'Game is not active' }, { status: 400 }) };
            const config = twr_difficulty_config[game.difficulty];
            if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= config.tiles) {
                return { response: json({ error: 'Invalid tile index' }, { status: 400 }) };
            }

            game.lastActivity = Date.now();
            if (game.floorBombPositions[game.currentFloor].includes(tileIndex)) {
                const deleted = await claimTowerSession(sessionToken, game.version);
                if (!deleted) return { response: json({ code: 'ROUND_NOT_FOUND', error: 'Session already processed' }, { status: 400 }) };

                await tx.update(user).set({
                    arcadeLosses: `${Number(row.arcadeLosses || 0) + game.betAmount}`,
                    arcadeWinStreak: 0,
                    totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
                    totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + game.betAmount}`,
                    updatedAt: new Date()
                }).where(eq(user.id, userId));
                return {
                    response: json({ hitBomb: true, allBombPositions: game.floorBombPositions, newBalance: Number(row.baseCurrencyBalance), status: 'lost', amountWagered: game.betAmount }),
                    arcadeWon: false
                };
            }

            game.currentFloor += 1;
            game.currentMultiplier = calculateTowerMultiplier(game.currentFloor, game.difficulty as TowerDifficulty);
            if (game.currentFloor >= twr_floors) {
                const deleted = await claimTowerSession(sessionToken, game.version);
                if (!deleted) return { response: json({ code: 'ROUND_NOT_FOUND', error: 'Session already processed' }, { status: 400 }) };

                const payout = Math.round(game.betAmount * game.currentMultiplier * 100000000) / 100000000;
                const newBalance = Math.round((Number(row.baseCurrencyBalance) + payout) * 100000000) / 100000000;
                const streak = (row.arcadeWinStreak || 0) + 1;
                await tx.update(user).set({
                    baseCurrencyBalance: newBalance.toFixed(8),
                    arcadeWins: `${Number(row.arcadeWins || 0) + (payout - game.betAmount)}`,
                    arcadeWinStreak: streak,
                    arcadeBestWinStreak: Math.max(streak, row.arcadeBestWinStreak || 0),
                    totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
                    totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + game.betAmount}`,
                    updatedAt: new Date()
                }).where(eq(user.id, userId));
                return {
                    response: json({ hitBomb: false, currentFloor: game.currentFloor, currentMultiplier: game.currentMultiplier, status: 'won', newBalance, payout, allBombPositions: game.floorBombPositions }),
                    arcadeWon: true
                };
            }

            const lua = `
                local cur = redis.call("get", KEYS[1])
                if cur then
                    local s = cjson.decode(cur)
                    if (s.version or 0) == tonumber(ARGV[2]) then
                        redis.call("set", KEYS[1], ARGV[1])
                        return 1
                    end
                end
                return 0
            `;
            const version = game.version || 0;
            game.version = version + 1;
            const updated = (await redis.eval(lua, {
                keys: [getSessionKey(sessionToken)],
                arguments: [JSON.stringify(game), String(version)]
            })) as number;
            if (!updated) {
                if (!(await redis.get(getSessionKey(sessionToken)))) {
                    return { response: json({ code: 'ROUND_NOT_FOUND', error: 'Session already processed' }, { status: 400 }) };
                }
                return { response: json({ error: 'Session was modified or removed' }, { status: 400 }) };
            }
            return { response: json({ hitBomb: false, currentFloor: game.currentFloor, currentMultiplier: game.currentMultiplier, status: game.status }) };
        });

        if (result.arcadeWon !== undefined) {
            await checkAndAwardAchievements(userId, ['arcade', 'wealth'], {
                arcadeWon: result.arcadeWon,
                arcadeWager: snapshot.betAmount
            });
        }
        return result.response;
    } catch (e) {
        console.error('Tower step error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
