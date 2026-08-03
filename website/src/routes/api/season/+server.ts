import { json, error } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { season, seasonParticipant } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import {
	getActiveSeason,
	getSeasonByNumber,
	getSeasonLeaderboard,
	getArchivedLeaderboard,
	getUserSeasonStanding,
	getEntrantCount,
	ensureSeasonExists
} from '$lib/server/seasons';
import { RANKED_STAKE } from '$lib/data/seasons';
import { checkAndAwardAchievements } from '$lib/server/achievements';

export const GET: RequestHandler = async ({ request, url }) => {
	await ensureSeasonExists();

	const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 100);

	const pastSeasonsQuery = db
		.select({ number: season.number, name: season.name, endedAt: season.endedAt })
		.from(season)
		.where(eq(season.status, 'ENDED'))
		.orderBy(desc(season.number))
		.limit(12);

	const archiveParam = url.searchParams.get('c');
	if (archiveParam !== null) {
		const number = Number(archiveParam);
		if (!Number.isInteger(number)) throw error(400, 'Invalid season');

		const target = await getSeasonByNumber(number);
		if (!target || target.status !== 'ENDED') throw error(404, 'No archived season with that number');

		const [leaderboard, entrants, pastSeasons] = await Promise.all([
			getArchivedLeaderboard(target.id, 100),
			getEntrantCount(target.id),
			pastSeasonsQuery
		]);

		return json({
			archived: true,
			season: {
				id: target.id,
				number: target.number,
				name: target.name,
				backgroundImage: target.backgroundImage,
				startsAt: target.startsAt,
				endsAt: target.endsAt,
				endedAt: target.endedAt,
				rankedStake: Number(target.rankedStake),
				entrants
			},
			leaderboard,
			me: null,
			pastSeasons,
			rankedStake: RANKED_STAKE
		});
	}

	const current = await getActiveSeason();
	if (!current) {
		return json({ season: null, leaderboard: [], me: null, pastSeasons: await pastSeasonsQuery });
	}

	const [leaderboard, entrants, recent] = await Promise.all([
		getSeasonLeaderboard(current.id, limit),
		getEntrantCount(current.id),
		pastSeasonsQuery
	]);

	let me = null;
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (session?.user) {
			const userId = Number(session.user.id);

			const [entry] = await db
				.select({ id: seasonParticipant.id })
				.from(seasonParticipant)
				.where(and(
					eq(seasonParticipant.seasonId, current.id),
					eq(seasonParticipant.userId, userId)
				))
				.limit(1);

			if (entry) {
				const standing = await getUserSeasonStanding(current.id, userId);
				me = { joined: true, userId, ...standing };

				if (standing) {
					checkAndAwardAchievements(userId, ['season'], {
					seasonGrowth: standing.growth
					}).catch(console.error);
				}
			} else {
				me = { joined: false, userId };
			}
		}
	} catch {
	}

	return json({
		archived: false,
		season: {
			id: current.id,
			number: current.number,
			name: current.name,
			backgroundImage: current.backgroundImage,
			startsAt: current.startsAt,
			endsAt: current.endsAt,
			rankedStake: Number(current.rankedStake),
			entrants
		},
		leaderboard,
		me,
		pastSeasons: recent,
		rankedStake: RANKED_STAKE
	});
};
