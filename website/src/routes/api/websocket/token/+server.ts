import { randomBytes } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.userSession) throw error(401, 'Not authenticated');
    const token = randomBytes(32).toString('hex');
    await redis.set(`websocket:token:${token}`, locals.userSession.id, { EX: 30 });
    return json({ token }, { headers: { 'Cache-Control': 'no-store' } });
};
