import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { getCrashState } from '$lib/server/games/crash';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user ? Number(session.user.id) : null;

    try {
        const state = await getCrashState(userId);
        return json(state);
    } catch (e) {
        console.error('Crash state error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};