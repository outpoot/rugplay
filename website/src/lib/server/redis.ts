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
