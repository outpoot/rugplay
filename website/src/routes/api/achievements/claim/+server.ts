import { json } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { claimAchievement, claimAllAchievements } from '$lib/server/achievements';

export async function POST({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = Number(session.user.id);
	const body = await request.json();

	if (body.claimAll) {
		const result = await claimAllAchievements(userId);
		if (result.count === 0) {
			return json({ error: 'No unclaimed achievements' }, { status: 400 });
		}
		return json({
			claimed: result.count,
			cashReward: result.cashReward,
			gemReward: result.gemReward,
		});
	}

	const { achievementId } = body;
	if (!achievementId || typeof achievementId !== 'string') {
		return json({ error: 'Invalid achievement ID' }, { status: 400 });
	}

	const result = await claimAchievement(userId, achievementId);
	if (!result) {
		return json({ error: 'Achievement not found or already claimed' }, { status: 400 });
	}

	return json({
		claimed: 1,
		cashReward: result.cashReward,
		gemReward: result.gemReward,
	});
}
