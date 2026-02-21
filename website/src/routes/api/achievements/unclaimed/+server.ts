import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userAchievement } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '$lib/auth';

export async function GET({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ count: 0 });
	}

	const userId = Number(session.user.id);
	const unclaimed = await db
		.select({ achievementId: userAchievement.achievementId })
		.from(userAchievement)
		.where(and(eq(userAchievement.userId, userId), eq(userAchievement.claimed, false)));

	return json({ count: unclaimed.length });
}
