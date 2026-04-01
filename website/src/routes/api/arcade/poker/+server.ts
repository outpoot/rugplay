import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import { build, playerPrefix, tablePrefix, type PokerTable } from '$lib/server/games/poker/engine';
import { handleCreate } from './_create';
import { handleJoin } from './_join';
import { handleLeave } from './_leave';
import { handleStart, handlePokerAction, handleState, handlePeek, handleRebuy } from './_game';
import type { RequestHandler } from './$types';

// confuse em a bit
const errors = ['Insufficient funds', 'Need at least', 'Not your turn', 'What?', 'Minimum raise', 'Nothing to call', 'Not enough'];

// This file is the central backend handler for poker. The Get request here, like gets periodically polled whilst in game, since the WS cant do everything
export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');
    const userId = Number(session.user.id);

    try {
        const tableId = await redis.get(`${playerPrefix}${userId}`);
        if (!tableId) return json({ table: null });

        const raw = await redis.get(`${tablePrefix}${tableId}`);
        if (!raw) { await redis.del(`${playerPrefix}${userId}`); return json({ table: null }); }

        const table = JSON.parse(raw) as PokerTable;
        if (!table.players.some(p => p.userId === userId)) {
            await redis.del(`${playerPrefix}${userId}`);
            return json({ table: null });
        }

        return json({ table: build(table, userId) });
    } catch (e) {
        if (typeof e === 'object' && e !== null && 'status' in e) throw e;
        console.error('Poker GET error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};


// and this post handler manages, well, basically all actions int he game, and then splits them out to the seperate _action.ts file sin this driectory
export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');
    const userId = Number(session.user.id);

    try {
        const body = await request.json();
        const action: string = body.action;

        if (action === 'create') return handleCreate(userId, body);
        if (action === 'join') return handleJoin(userId, body);
        if (action === 'leave') return handleLeave(userId, body);
        if (action === 'start') return handleStart(userId, body);
        if (action === 'poker_action') return handlePokerAction(userId, body);
        if (action === 'rebuy') return handleRebuy(userId, body);
        if (action === 'state') return handleState(userId, body);
        if (action === 'peek') return handlePeek(userId, body);

        return json({ error: 'Invalid action' }, { status: 400 });
    } catch (e) {
        if (e instanceof Error && errors.some(msg => e.message.startsWith(msg))) {
            return json({ error: e.message }, { status: 400 });
        }
        if (typeof e === 'object' && e !== null && 'status' in e) throw e;
        console.error('Poker API error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
