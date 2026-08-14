import { auth } from "$lib/auth";
import { error } from "@sveltejs/kit";
import { redis } from "$lib/server/redis";

export const MAX_DAILY_API_REQUESTS = 2000;

function getUsageKey(userId: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
    return `api:usage:${userId}:${today}`;
}

function secondsUntilEndOfDayUTC(): number {
    const now = new Date();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.max(60, Math.ceil((endOfDay.getTime() - now.getTime()) / 1000));
}

/**
 * Reads how many API requests the user has used today. Used by the API
 * dashboard so the displayed usage matches the enforced limit and always
 * resets daily. Returns 0 when there is no counter (or Redis is unavailable).
 */
export async function getDailyApiUsage(userId: string): Promise<number> {
    try {
        const value = await redis.get(getUsageKey(userId));
        return Number(value || 0);
    } catch (e) {
        console.error('Failed to read API usage from Redis:', e);
        return 0;
    }
}

export async function verifyApiKeyAndGetUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw error(401, 'API key required. Use Authorization: Bearer <api-key>');
    }

    const apiKeyStr = authHeader.substring(7);
    const { valid, error: verifyError, key } = await auth.api.verifyApiKey({
        body: { key: apiKeyStr }
    });

    if (verifyError || !valid || !key) {
        throw error(401, 'Invalid API key');
    }

    const userId = key.userId;

    // Enforce the daily request limit with an atomic Redis counter that expires
    // at the end of the day. This replaces the old `remaining` field on the key,
    // which was never decremented consistently and never reset, letting users
    // use effectively unlimited requests while the dashboard stayed frozen.
    try {
        const usage = await redis.incr(getUsageKey(userId));
        if (usage === 1) {
            await redis.expire(getUsageKey(userId), secondsUntilEndOfDayUTC()).catch(() => {});
        }
        if (usage > MAX_DAILY_API_REQUESTS) {
            throw error(429, 'Daily API limit exceeded. Limit resets at midnight UTC.');
        }
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e && (e as any).status === 429) {
            throw e;
        }
        // Fail open if Redis is unavailable so a Redis blip doesn't take down
        // the entire public API.
        console.error('Failed to enforce API usage limit:', e);
    }

    return userId;
}