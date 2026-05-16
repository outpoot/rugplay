import { redis } from './redis';

export async function checkRateLimit(
    userId: string | number,
    key: string,
    limit: number,
    windowSecs: number
): Promise<boolean> {
    const bucket = Math.floor(Date.now() / (windowSecs * 1000));
    const redisKey = `rl:${userId}:${key}:${bucket}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
        await redis.expire(redisKey, windowSecs * 2);
    }
    return count <= limit;
}
