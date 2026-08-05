import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { placeCrashBet, CRASH_MAX_BET, CRASH_MIN_BET } from '$lib/server/games/crash';
import { validateBetAmount } from '$lib/utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    try {
        const { amount } = await request.json();
        const userId = Number(session.user.id);

        const bet = validateBetAmount(amount, CRASH_MIN_BET, CRASH_MAX_BET);

        const result = await placeCrashBet(userId, bet);
        return json(result);
    } catch (e) {
        if (e instanceof Error && e.message.startsWith('Insufficient funds')) {
            return json({ error: e.message }, { status: 400 });
        }
        if (e instanceof Error && e.message.includes('Betting is closed')) {
            return json({ error: e.message }, { status: 400 });
        }
        if (e instanceof Error && e.message.includes('already have a bet')) {
            return json({ error: e.message }, { status: 400 });
        }
        if (e instanceof Error && e.message.includes('round is full')) {
            return json({ error: e.message }, { status: 400 });
        }
        if (e instanceof Error && e.message.startsWith('Bet amount')) {
            return json({ error: e.message }, { status: 400 });
        }
        console.error('Crash bet error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};