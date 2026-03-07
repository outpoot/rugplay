import { json, error } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import { randomUUID } from 'crypto';

export async function POST({ locals }) {
    const user = locals.userSession;
    if (!user) throw error(401, 'Unauthorized');

    const token = randomUUID();
    await redis.set(`ws_token:${token}`, JSON.stringify({
        userId: user.id,
        username: user.name,
        handle: user.username,
        userImage: user.image
    }), { EX: 30 });

    return json({ token });
}
