import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userAchievement, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ACHIEVEMENTS } from '$lib/data/achievements';

export async function GET({ params }) {
	const { userId } = params;
	if (!userId) throw error(400, 'User ID or username is required');

	const isNumeric = /^\d+$/.test(userId);
	const userData = await db.query.user.findFirst({
		where: isNumeric ? eq(user.id, parseInt(userId)) : eq(user.username, userId),
		columns: { id: true },
	});

	if (!userData) throw error(404, 'User not found');

	const unlocked = await db
		.select({ achievementId: userAchievement.achievementId, unlockedAt: userAchievement.unlockedAt })
		.from(userAchievement)
		.where(eq(userAchievement.userId, userData.id));

	const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

	const achievements = ACHIEVEMENTS.map((a) => ({
		...a,
		unlocked: unlockedMap.has(a.id),
		unlockedAt: unlockedMap.get(a.id) ?? null,
	}));

	return json({ achievements });
}
