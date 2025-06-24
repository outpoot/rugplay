import { createClient } from 'redis';
import { REDIS_URL } from '$env/static/private';
import { building } from '$app/environment';

const redisUrl = REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: redisUrl
});

client.on('error', (err: any) => console.error('Redis Client Error:', err));

if (!building) {
    await client.connect().catch(console.error);
}

export { client as redis };

const TURNSTILE_PREFIX = 'turnstile:verified:';
const TURNSTILE_TTL = 5 * 60; // 5 minutes

export async function setTurnstileVerifiedRedis(userId: string) {
    await client.set(`${TURNSTILE_PREFIX}${userId}`, '1', { EX: TURNSTILE_TTL });
}

export async function isTurnstileVerifiedRedis(userId: string): Promise<boolean> {
    return !!(await client.get(`${TURNSTILE_PREFIX}${userId}`));
}
