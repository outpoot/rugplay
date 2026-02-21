import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { checkAndAwardAchievements } from '$lib/server/achievements';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const THIRTY_SIX_HOURS_MS = 36 * 60 * 60 * 1000;
const DAILY_GEM_BONUS = 10;

const REWARD_TIERS = [
    1200,   // Day 1
    1500,   // Day 2
    1800,   // Day 3
    2100,   // Day 4
    2500,   // Day 5
    3000,   // Day 6
    3500,   // Day 7
    4000,   // Day 8
    4200,   // Day 9
    4400,   // Day 10
    4600,   // Day 11
    4800,   // Day 12
    5000,   // Day 13
    5200,   // Day 14
    5400,   // Day 15
    5600,   // Day 16
    5800,   // Day 17
    6000,   // Day 18
    6200,   // Day 19
    6400,   // Day 20
    6600,   // Day 21
    6800,   // Day 22
    7000,   // Day 23
    7200,   // Day 24
    7400,   // Day 25
    7600,   // Day 26
    7800,   // Day 27
    8000,   // Day 28
    8200,   // Day 29
    8500    // Day 30+
];

const PRESTIGE_MULTIPLIERS = {
    0: 1.0,    // No prestige
    1: 1.25,   // 25% bonus
    2: 1.5,    // 50% bonus
    3: 1.75,   // 75% bonus
    4: 2.0,    // 100% bonus
    5: 2.5,    // 150% bonus
};

function getPrestigeMultiplier(prestigeLevel: number): number {
    return PRESTIGE_MULTIPLIERS[prestigeLevel as keyof typeof PRESTIGE_MULTIPLIERS] || 1.0;
}

const STREAK_GRACE_HOURS = 24;

function calculateStreak(lastClaim: Date | null, currentStreak: number): number {
    if (!lastClaim) return 1;

    const timeSinceLastClaim = Date.now() - lastClaim.getTime();
    const graceMs = STREAK_GRACE_HOURS * 60 * 60 * 1000;
    const effectiveMaxWindow = THIRTY_SIX_HOURS_MS + graceMs;

    // reset streak if more than 36 hours
    if (timeSinceLastClaim > effectiveMaxWindow) return 1;

    // only increment if within valid window (12-36 hours)
    if (timeSinceLastClaim >= TWELVE_HOURS_MS) return currentStreak + 1;

    return currentStreak;
}

function calculateReward(streak: number, prestigeLevel: number = 0): { total: number; base: number; prestigeBonus: number } {
    const tierIndex = Math.min(streak - 1, REWARD_TIERS.length - 1);
    const base = REWARD_TIERS[tierIndex];
    const prestigeMultiplier = getPrestigeMultiplier(prestigeLevel);
    const prestigeBonus = base * (prestigeMultiplier - 1);
    const total = base + prestigeBonus;

    return { total, base, prestigeBonus };
}

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const now = new Date();

    return await db.transaction(async (tx) => {
        const userData = await tx.select({
            id: user.id,
            baseCurrencyBalance: user.baseCurrencyBalance,
            lastRewardClaim: user.lastRewardClaim,
            totalRewardsClaimed: user.totalRewardsClaimed,
            loginStreak: user.loginStreak,
            prestigeLevel: user.prestigeLevel,
            gems: user.gems
        })
            .from(user)
            .where(eq(user.id, userId))
            .for('update')
            .limit(1);

        if (!userData[0]) {
            throw error(404, 'User not found');
        }

        const currentUser = userData[0];

        if (currentUser.lastRewardClaim) {
            const timeSinceLastClaim = now.getTime() - currentUser.lastRewardClaim.getTime();
            if (timeSinceLastClaim < TWELVE_HOURS_MS) {
                return json({
                    error: 'Daily reward not yet available',
                    canClaim: false,
                    timeRemaining: TWELVE_HOURS_MS - timeSinceLastClaim
                }, { status: 429 });
            }
        }

        const newStreak = calculateStreak(currentUser.lastRewardClaim, currentUser.loginStreak || 0);
        const reward = calculateReward(newStreak, currentUser.prestigeLevel || 0);

        const currentBalance = parseFloat(currentUser.baseCurrencyBalance || '0');
        const currentTotalRewards = parseFloat(currentUser.totalRewardsClaimed || '0');
        const newBalance = currentBalance + reward.total;
        const newTotalRewards = currentTotalRewards + reward.total;

        await tx.update(user)
            .set({
                baseCurrencyBalance: newBalance.toFixed(8),
                lastRewardClaim: now,
                totalRewardsClaimed: newTotalRewards.toFixed(8),
                loginStreak: newStreak,
                gems: sql`${user.gems} + ${DAILY_GEM_BONUS}`
            })
            .where(eq(user.id, currentUser.id));

        checkAndAwardAchievements(userId, ['streaks'], { newStreak, totalRewardsClaimed: newTotalRewards });

        return json({
            success: true,
            rewardAmount: reward.total,
            baseReward: reward.base,
            prestigeBonus: reward.prestigeBonus,
            prestigeLevel: currentUser.prestigeLevel || 0,
            gemsAwarded: DAILY_GEM_BONUS,
            newBalance,
            totalRewardsClaimed: newTotalRewards,
            loginStreak: newStreak,
            nextClaimTime: new Date(now.getTime() + TWELVE_HOURS_MS)
        });
    });
};

export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const [currentUser] = await db.select({
        id: user.id,
        baseCurrencyBalance: user.baseCurrencyBalance,
        lastRewardClaim: user.lastRewardClaim,
        totalRewardsClaimed: user.totalRewardsClaimed,
        loginStreak: user.loginStreak,
        prestigeLevel: user.prestigeLevel
    })
        .from(user)
        .where(eq(user.id, Number(session.user.id)))
        .limit(1);

    if (!currentUser) {
        throw error(404, 'User not found');
    }

    const now = new Date();

    let canClaim = true;
    let timeRemaining = 0;
    let nextClaimTime = null;

    if (currentUser.lastRewardClaim) {
        const timeSinceLastClaim = now.getTime() - currentUser.lastRewardClaim.getTime();
        if (timeSinceLastClaim < TWELVE_HOURS_MS) {
            canClaim = false;
            timeRemaining = TWELVE_HOURS_MS - timeSinceLastClaim;
            nextClaimTime = new Date(currentUser.lastRewardClaim.getTime() + TWELVE_HOURS_MS);
        }
    }

    const potentialStreak = calculateStreak(currentUser.lastRewardClaim, currentUser.loginStreak || 0);
    const reward = calculateReward(potentialStreak, currentUser.prestigeLevel || 0);

    return json({
        canClaim,
        rewardAmount: reward.total,
        baseReward: reward.base,
        prestigeBonus: reward.prestigeBonus,
        prestigeLevel: currentUser.prestigeLevel || 0,
        timeRemaining,
        nextClaimTime,
        totalRewardsClaimed: Number(currentUser.totalRewardsClaimed || 0),
        lastRewardClaim: currentUser.lastRewardClaim,
        loginStreak: currentUser.loginStreak || 0
    });
};