import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userAchievement } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/auth';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '$lib/data/achievements';
import { getAchievementProgress, checkAndAwardAchievements } from '$lib/server/achievements';

export async function GET({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false, unlockedAt: null, claimed: false, progress: null })) });
	}

	const userId = Number(session.user.id);

	await checkAndAwardAchievements(userId, [...ACHIEVEMENT_CATEGORIES]);

	const [unlocked, progress] = await Promise.all([
		db
			.select({ achievementId: userAchievement.achievementId, unlockedAt: userAchievement.unlockedAt, claimed: userAchievement.claimed })
			.from(userAchievement)
			.where(eq(userAchievement.userId, userId)),
		getAchievementProgress(userId),
	]);

	const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u]));

	const achievements = ACHIEVEMENTS.map((a) => {
		const entry = unlockedMap.get(a.id);
		return {
			...a,
			unlocked: !!entry,
			unlockedAt: entry?.unlockedAt ?? null,
			claimed: entry?.claimed ?? false,
			progress: a.targetValue && !entry ? Math.min(progress[a.id] ?? 0, a.targetValue) : null,
		};
	});

	const unclaimedCount = unlocked.filter((u) => !u.claimed).length;

	return json({ achievements, unlockedCount: unlocked.length, unclaimedCount });
}
