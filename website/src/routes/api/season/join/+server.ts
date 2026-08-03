import { error, json } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { user, seasonParticipant, notifications } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getActiveSeason } from '$lib/server/seasons';
import { liquidateHoldings } from '$lib/server/liquidate';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { formatValue } from '$lib/utils';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const userId = Number(session.user.id);

	const current = await getActiveSeason();
	if (!current) throw error(400, 'There is no active season right now');

	const stake = Number(current.rankedStake);

	return await db.transaction(async (tx) => {
		const [userData] = await tx
			.select({
				id: user.id,
				baseCurrencyBalance: user.baseCurrencyBalance,
				isBanned: user.isBanned
			})
			.from(user)
			.where(eq(user.id, userId))
			.for('update')
			.limit(1);

		if (!userData) throw error(404, 'User not found');
		if (userData.isBanned) throw error(403, 'Banned accounts cannot enter a season');

		const [existing] = await tx
			.select({ id: seasonParticipant.id })
			.from(seasonParticipant)
			.where(and(
				eq(seasonParticipant.seasonId, current.id),
				eq(seasonParticipant.userId, userId)
			))
			.limit(1);

		if (existing) throw error(400, `You have already entered ${current.name}`);

		const balance = Number(userData.baseCurrencyBalance);
		if (balance < stake) {
			throw error(400, `Entering ${current.name} requires ${formatValue(stake)} in cash. You have ${formatValue(balance)}. Coin holdings don't count toward entry - sell first.`);
		}

		const { totalSaleValue, coinsSold } = await liquidateHoldings(tx, userId);

		const totalBefore = balance + totalSaleValue;
		const sacrificed = Math.max(0, totalBefore - stake);
		await tx
			.update(user)
			.set({
				baseCurrencyBalance: stake.toFixed(8),
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		await tx.insert(seasonParticipant).values({
			seasonId: current.id,
			userId,
			startingStake: stake.toFixed(8),
			sacrificed: sacrificed.toFixed(8)
		});

		await tx.insert(notifications).values({
			userId,
			type: 'SYSTEM',
			title: `You're in ${current.name}`,
			message: `You entered ranked with ${formatValue(stake)}. ${coinsSold > 0 ? `${coinsSold} holding${coinsSold === 1 ? '' : 's'} were liquidated and ` : ''}${formatValue(sacrificed)} was burned on entry. Good luck.`,
			link: '/season'
		});

		checkAndAwardAchievements(userId, ['season'], { seasonJoined: true });

		return json({
			success: true,
			seasonNumber: current.number,
			seasonName: current.name,
			startingStake: stake,
			sacrificed,
			coinsSold
		});
	});
};
