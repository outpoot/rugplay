import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { getUserDailyMissions, claimMissionReward } from '$lib/server/missions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const missions = await getUserDailyMissions(userId);

    const unclaimedCount = missions.filter((m) => m.completed && !m.claimed).length;

    return json({ missions, unclaimedCount });
};

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const { missionId } = await request.json();

    if (!missionId || typeof missionId !== 'string') {
        return json({ error: 'Invalid mission ID' }, { status: 400 });
    }

    const result = await claimMissionReward(userId, missionId);
    if (!result) {
        return json({ error: 'Mission not completed or already claimed' }, { status: 400 });
    }

    return json({ success: true, cashReward: result.cashReward, gemReward: result.gemReward });
};