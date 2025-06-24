import { auth } from "$lib/auth";
import { resolveExpiredQuestions, processAccountDeletions } from "$lib/server/job";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { redis } from "$lib/server/redis";
import { building } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { minesCleanupInactiveGames, minesAutoCashout } from '$lib/server/games/mines';

async function initializeScheduler() {
    if (building) return;

    try {
        const lockKey = 'hopium:scheduler';
        const lockValue = `${process.pid}-${Date.now()}`;
        const lockTTL = 300; // 5 minutes

        const result = await redis.set(lockKey, lockValue, {
            NX: true,
            EX: lockTTL
        });

        if (result === 'OK') {
            console.log(`🕐 Starting scheduler (PID: ${process.pid})`);

            // Renew lock periodically
            const renewInterval = setInterval(async () => {
                try {
                    const currentValue = await redis.get(lockKey);
                    if (currentValue === lockValue) {
                        await redis.expire(lockKey, lockTTL);
                    } else {
                        // Lost the lock, stop scheduler
                        clearInterval(renewInterval);
                        clearInterval(schedulerInterval);
                        console.log('Lost scheduler lock, stopping...');
                    }
                } catch (error) {
                    console.error('Failed to renew scheduler lock:', error);
                }
            }, (lockTTL / 2) * 1000); // Renew at half the TTL

            resolveExpiredQuestions().catch(console.error);
            processAccountDeletions().catch(console.error);

            const schedulerInterval = setInterval(() => {
                resolveExpiredQuestions().catch(console.error);
                processAccountDeletions().catch(console.error);
            }, 5 * 60 * 1000);

            const minesCleanupInterval = setInterval(() => {
                minesCleanupInactiveGames().catch(console.error);
                minesAutoCashout().catch(console.error);
            }, 60 * 1000);

            // Cleanup on process exit
            const cleanup = async () => {
                clearInterval(renewInterval);
                clearInterval(schedulerInterval);
                clearInterval(minesCleanupInterval);
                const currentValue = await redis.get(lockKey);
                if (currentValue === lockValue) {
                    await redis.del(lockKey);
                }
            };

            process.on('SIGTERM', cleanup);
            process.on('SIGINT', cleanup);
            process.on('beforeExit', cleanup);
        } else {
            console.log('📋 Scheduler already running');
        }
    } catch (error) {
        console.error('Failed to initialize scheduler:', error);
    }
}

initializeScheduler();

const sessionCache = new Map<string, {
    userData: any;
    timestamp: number;
    ttl: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessionCache.entries()) {
        if (now - value.timestamp > value.ttl) {
            sessionCache.delete(key);
        }
    }
}, CACHE_CLEANUP_INTERVAL);

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname.startsWith('/.well-known/appspecific/com.chrome.devtools')) {
        return new Response(null, { status: 204 });
    }

    // Get session from auth
    const session = await auth.api.getSession({
        headers: event.request.headers
    });

    let userData = null;

    if (session?.user) {
        const userId = session.user.id;
        const cacheKey = `user:${userId}`;
        const now = Date.now();
        
        const cached = sessionCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < cached.ttl) {
            userData = cached.userData;
        } else {
            const [userRecord] = await db
                .select({
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    image: user.image,
                    isBanned: user.isBanned,
                    banReason: user.banReason,
                    baseCurrencyBalance: user.baseCurrencyBalance,
                    bio: user.bio,
                    volumeMaster: user.volumeMaster,
                    volumeMuted: user.volumeMuted
                })
                .from(user)
                .where(eq(user.id, Number(userId)))
                .limit(1);

            if (userRecord?.isBanned) {
                try {
                    await auth.api.signOut({
                        headers: event.request.headers
                    });
                } catch (e) {
                    console.error('Failed to sign out banned user:', e);
                }

                if (event.url.pathname !== '/banned') {
                    const banReason = encodeURIComponent(userRecord.banReason || 'Account suspended');
                    throw redirect(302, `/banned?reason=${banReason}`);
                }
            } else if (userRecord) {
                userData = {
                    id: userRecord.id.toString(),
                    name: userRecord.name,
                    username: userRecord.username,
                    email: userRecord.email,
                    isAdmin: userRecord.isAdmin || false,
                    image: userRecord.image || '',
                    isBanned: userRecord.isBanned || false,
                    banReason: userRecord.banReason,
                    avatarUrl: userRecord.image,
                    baseCurrencyBalance: parseFloat(userRecord.baseCurrencyBalance || '0'),
                    bio: userRecord.bio || '',
                    volumeMaster: parseFloat(userRecord.volumeMaster || '0.7'),
                    volumeMuted: userRecord.volumeMuted || false
                };

                const cacheTTL = userRecord.isAdmin ? CACHE_TTL * 2 : CACHE_TTL;
                sessionCache.set(cacheKey, {
                    userData,
                    timestamp: now,
                    ttl: cacheTTL
                });
            }
        }
    }

    event.locals.userSession = userData;

    if (event.url.pathname.startsWith('/api/')) {
        const response = await svelteKitHandler({ event, resolve, auth });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

        return response;
    }

    return svelteKitHandler({ event, resolve, auth });
};

export function clearUserCache(userId: string) {
    sessionCache.delete(`user:${userId}`);
}