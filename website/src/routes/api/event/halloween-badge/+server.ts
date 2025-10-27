import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { sum } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import type { RequestHandler } from './$types';

const COMMUNITY_GOAL = 200000000; // $200M
const REDIS_KEY = 'halloween:community_losses';
const REDIS_INIT_LOCK = 'halloween:init_lock';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 100;

async function ensureRedisInit(): Promise<void> {
    const lockAcquired = await redis.set(REDIS_INIT_LOCK, '1', {
        NX: true,
        EX: 10
    });

    if (lockAcquired) {
        try {
            const exists = await redis.exists(REDIS_KEY);
            if (!exists) {
                const [communityStats] = await db
                    .select({
                        totalLosses: sum(user.gamblingLosses)
                    })
                    .from(user);

                const totalCommunityLosses = Number(communityStats?.totalLosses || 0);
                await redis.set(REDIS_KEY, totalCommunityLosses.toString());
                console.log(`Initialized Redis with community losses: ${totalCommunityLosses}`);
            }
        } finally {
            await redis.del(REDIS_INIT_LOCK);
        }
    } else {
        let retries = MAX_RETRIES;
        while (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            const exists = await redis.exists(REDIS_KEY);
            if (exists) {
                return;
            }
            retries--;
        }
        
        throw new Error(`Failed to initialize Redis after ${MAX_RETRIES} retries`);
    }
}

export const GET: RequestHandler = async () => {
    try {
        await ensureRedisInit();

        const totalCommunityLosses = Number(await redis.get(REDIS_KEY) || 0);
        const goalReached = totalCommunityLosses >= COMMUNITY_GOAL;

        return json({
            goalReached,
            totalCommunityLosses,
            goal: COMMUNITY_GOAL
        });
    } catch (e) {
        console.error('Halloween event API error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 500 });
    }
};