import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { cashoutCrashBet } from '$lib/server/games/crash';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const userId = Number(session.user.id);
        const result = await cashoutCrashBet(userId);
        return json(result);
    } catch (e) {
        if (e instanceof Error) {
            const msg = e.message;
            if (
                msg.includes('crashed') ||
                msg.includes('not running') ||
                msg.includes('already cashed') ||
                msg.includes('no active bet')
            ) {
                return json({ error: msg }, { status: 400 });
            }
        }
        console.error('Crash cashout error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};