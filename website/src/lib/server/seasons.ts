import { db } from '$lib/server/db';
import { season, seasonParticipant, seasonTrophy, user } from '$lib/server/db/schema';
import { and, asc, eq, desc, isNotNull, lte, sql } from 'drizzle-orm';
import { SWAP_FEE_RATE } from '$lib/data/constants';
import {
	SEASON_LENGTH_MS,
	RANKED_STAKE,
	getSeasonName,
	getTrophyTier
} from '$lib/data/seasons';
import { createNotification } from '$lib/server/notification';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export const SEASON_ONE_BACKGROUND = '/season1_background.webp';

const realizableValueExpr = sql`
	CAST(u.base_currency_balance AS NUMERIC) + COALESCE((
		SELECT SUM(
			(CAST(c.pool_base_currency_amount AS NUMERIC) * CAST(p.quantity AS NUMERIC))
			/ NULLIF(CAST(c.pool_coin_amount AS NUMERIC) + CAST(p.quantity AS NUMERIC), 0)
			* ${1 - SWAP_FEE_RATE}
		)
		FROM user_portfolio p
		JOIN coin c ON c.id = p.coin_id
		WHERE p.user_id = u.id
		  AND CAST(c.pool_coin_amount AS NUMERIC) > 0
		  AND CAST(c.pool_base_currency_amount AS NUMERIC) > 0
	), 0)
`;

export async function getActiveSeason() {
	const [current] = await db
		.select()
		.from(season)
		.where(eq(season.status, 'ACTIVE'))
		.orderBy(desc(season.number))
		.limit(1);
	return current ?? null;
}

export async function ensureSeasonExists() {
	const [existing] = await db.select({ id: season.id }).from(season).limit(1);
	if (existing) return;

	const now = new Date();
	await db.insert(season).values({
		number: 1,
		name: getSeasonName(1),
		backgroundImage: SEASON_ONE_BACKGROUND,
		status: 'ACTIVE',
		startsAt: now,
		endsAt: new Date(now.getTime() + SEASON_LENGTH_MS),
		rankedStake: RANKED_STAKE.toFixed(8)
	}).onConflictDoNothing();

	console.log('🏁 Bootstrapped Season 1');
}

export async function getSeasonLeaderboard(seasonId: number, limit = 25) {
	const rows = await db.execute(sql`
		SELECT
			u.id AS "userId",
			u.username,
			u.name,
			u.image,
			u.name_color AS "nameColor",
			u.founder_badge AS "founderBadge",
			u.prestige_level AS "prestigeLevel",
			sp.starting_stake AS "startingStake",
			(${realizableValueExpr}) AS "realizableValue",
			(${realizableValueExpr}) AS "score"
		FROM season_participant sp
		JOIN "user" u ON u.id = sp.user_id
		WHERE sp.season_id = ${seasonId}
		  AND u.is_banned = false
		ORDER BY "score" DESC
		LIMIT ${limit}
	`);

	return (rows as unknown as any[]).map((r, i) => ({
		rank: i + 1,
		userId: Number(r.userId),
		username: r.username,
		name: r.name,
		image: r.image,
		nameColor: r.nameColor,
		founderBadge: r.founderBadge,
		prestigeLevel: Number(r.prestigeLevel ?? 0),
		startingStake: Number(r.startingStake),
		realizableValue: Number(r.realizableValue),
		score: Number(r.score),
		growth: Number(r.startingStake) > 0 ? Number(r.score) / Number(r.startingStake) : 0
	}));
}

export async function getUserSeasonStanding(seasonId: number, userId: number) {
	const rows = await db.execute(sql`
	WITH scored AS (
			SELECT
				sp.user_id,
				sp.starting_stake,
			(${realizableValueExpr}) AS realizable,
			(${realizableValueExpr}) AS score
			FROM season_participant sp
			JOIN "user" u ON u.id = sp.user_id
			WHERE sp.season_id = ${seasonId} AND u.is_banned = false
		), ranked AS (
			SELECT *, RANK() OVER (ORDER BY score DESC) AS rank FROM scored
		)
		SELECT rank, score, realizable, starting_stake AS "startingStake",
		       (SELECT COUNT(*) FROM scored) AS "totalEntrants"
		FROM ranked WHERE user_id = ${userId}
	`);

	const row = (rows as unknown as any[])[0];
	if (!row) return null;

	return {
		rank: Number(row.rank),
		score: Number(row.score),
		realizableValue: Number(row.realizable),
		startingStake: Number(row.startingStake),
		totalEntrants: Number(row.totalEntrants),
		growth: Number(row.startingStake) > 0 ? Number(row.score) / Number(row.startingStake) : 0
	};
}

export async function getSeasonByNumber(number: number) {
	const [row] = await db.select().from(season).where(eq(season.number, number)).limit(1);
	return row ?? null;
}

export async function getArchivedLeaderboard(seasonId: number, limit = 100) {
	const rows = await db
		.select({
			rank: seasonParticipant.finalRank,
			userId: seasonParticipant.userId,
			username: user.username,
			name: user.name,
			image: user.image,
			nameColor: user.nameColor,
			prestigeLevel: user.prestigeLevel,
			startingStake: seasonParticipant.startingStake,
			score: seasonParticipant.finalScore
		})
		.from(seasonParticipant)
		.innerJoin(user, eq(user.id, seasonParticipant.userId))
		.where(and(eq(seasonParticipant.seasonId, seasonId), isNotNull(seasonParticipant.finalRank)))
		.orderBy(asc(seasonParticipant.finalRank))
		.limit(limit);

	return rows.map((r) => ({
		rank: Number(r.rank),
		userId: Number(r.userId),
		username: r.username,
		name: r.name,
		image: r.image,
		nameColor: r.nameColor,
		prestigeLevel: Number(r.prestigeLevel ?? 0),
		startingStake: Number(r.startingStake),
		score: Number(r.score),
		growth: Number(r.startingStake) > 0 ? Number(r.score) / Number(r.startingStake) : 0
	}));
}

export async function getEntrantCount(seasonId: number): Promise<number> {
	const rows = await db.execute(sql`
		SELECT COUNT(*) AS n FROM season_participant WHERE season_id = ${seasonId}
	`);
	return Number((rows as unknown as any[])[0]?.n ?? 0);
}

export async function getBestTrophy(userId: number) {
	const rows = await db.execute(sql`
		SELECT t.rank, t.tier, s.number AS "seasonNumber", s.name AS "seasonName",
		       (SELECT COUNT(*) FROM season_participant p WHERE p.season_id = t.season_id) AS entrants,
		       (SELECT COUNT(*) FROM season_trophy t2 WHERE t2.user_id = ${userId}) AS "trophyCount"
		FROM season_trophy t
		JOIN season s ON s.id = t.season_id
		WHERE t.user_id = ${userId}
		ORDER BY t.rank ASC, s.number DESC
		LIMIT 1
	`);

	const row = (rows as unknown as any[])[0];
	if (!row) return { bestTrophy: null, trophyCount: 0 };

	return {
		bestTrophy: {
			rank: Number(row.rank),
			tier: row.tier,
			seasonNumber: Number(row.seasonNumber),
			seasonName: row.seasonName,
			entrants: Number(row.entrants)
		},
		trophyCount: Number(row.trophyCount)
	};
}

export async function getUserTrophies(userId: number) {
	const rows = await db
		.select({
			seasonId: seasonTrophy.seasonId,
			seasonNumber: season.number,
			seasonName: season.name,
			rank: seasonTrophy.rank,
			tier: seasonTrophy.tier,
			score: seasonTrophy.score,
			awardedAt: seasonTrophy.awardedAt
		})
		.from(seasonTrophy)
		.innerJoin(season, eq(season.id, seasonTrophy.seasonId))
		.where(eq(seasonTrophy.userId, userId))
		.orderBy(desc(season.number));

	return rows.map(r => ({ ...r, score: Number(r.score) }));
}

export async function rolloverSeasons() {
	await ensureSeasonExists();

	const now = new Date();

	const due = await db
		.select()
		.from(season)
		.where(and(eq(season.status, 'ACTIVE'), lte(season.endsAt, now)));

	for (const s of due) {
		try {
			const finals = await getSeasonLeaderboard(s.id, 100000);

			await db.transaction(async (tx) => {
				for (const entry of finals) {
					await tx
						.update(seasonParticipant)
						.set({
							finalScore: entry.score.toFixed(8),
							finalRank: entry.rank
						})
						.where(and(
							eq(seasonParticipant.seasonId, s.id),
							eq(seasonParticipant.userId, entry.userId)
						));

					await tx.insert(seasonTrophy).values({
						seasonId: s.id,
						userId: entry.userId,
						rank: entry.rank,
						tier: getTrophyTier(entry.rank),
						score: entry.score.toFixed(8)
					}).onConflictDoNothing();
				}

				await tx
					.update(season)
					.set({ status: 'ENDED', endedAt: now })
					.where(eq(season.id, s.id));

				const nextNumber = s.number + 1;
				const [scheduledNext] = await tx
					.select({ id: season.id })
					.from(season)
					.where(eq(season.number, nextNumber))
					.limit(1);

				if (scheduledNext) {
					await tx
						.update(season)
						.set({ status: 'ACTIVE' })
						.where(eq(season.id, scheduledNext.id));
				} else {
					await tx.insert(season).values({
						number: nextNumber,
						name: getSeasonName(nextNumber),
						status: 'ACTIVE',
						startsAt: now,
						endsAt: new Date(now.getTime() + SEASON_LENGTH_MS),
						rankedStake: RANKED_STAKE.toFixed(8)
					});
				}
			});

			console.log(`🏁 ${s.name} ended with ${finals.length} entrants; Season ${s.number + 1} is live`);

			for (const entry of finals.slice(0, 100)) {
				createNotification(
					entry.userId.toString(),
					'SYSTEM',
					`${s.name} results`,
					`You finished #${entry.rank} of ${finals.length} in ${s.name}. Your trophy is now permanent on your profile.`,
					`/season`
				).catch(console.error);
			}

			for (const entry of finals) {
				checkAndAwardAchievements(entry.userId, ['season'], {
					seasonFinalRank: entry.rank,
					seasonGrowth: entry.growth
				}).catch(console.error);
			}
		} catch (err) {
			console.error(`Failed to roll over season ${s.number}:`, err);
		}
	}
}
