import { auth } from "$lib/auth";
import { resolveExpiredQuestions } from "$lib/server/job";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { redis } from "$lib/server/redis";
import { building } from '$app/environment';

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

            const schedulerInterval = setInterval(() => {
                resolveExpiredQuestions().catch(console.error);
            }, 5 * 60 * 1000);

            // Cleanup on process exit
            const cleanup = async () => {
                clearInterval(renewInterval);
                clearInterval(schedulerInterval);
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

export async function handle({ event, resolve }) {
    // event.setHeaders({
    //     'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    // });

    return svelteKitHandler({ event, resolve, auth });
}