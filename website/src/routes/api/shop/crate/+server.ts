import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { user, userInventory } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';
import { NAME_COLOR_CATALOG, CRATE_TIERS } from '$lib/data/shop-catalog';
import type { Rarity, CrateTierId, CrateRewardTier } from '$lib/data/shop-catalog';
import type { RequestHandler } from './$types';
import { checkAndAwardAchievements } from '$lib/server/achievements';

const VALID_TIERS = new Set<CrateTierId>(['standard', 'premium', 'legendary', 'mythic']);

function rollCrate(rewards: CrateRewardTier[]): { tierIndex: number } {
	const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
	const roll = Math.floor(Math.random() * totalWeight);
	let cumulative = 0;
	for (let i = 0; i < rewards.length; i++) {
		cumulative += rewards[i].weight;
		if (roll < cumulative) return { tierIndex: i };
	}
	return { tierIndex: 0 };
}

function randomColorByRarity(
	rarity: Rarity,
	ownedKeys: string[]
): { key: string; actualRarity: Rarity } | null {
	// Try the requested rarity first
	const pool = NAME_COLOR_CATALOG.filter((c) => c.rarity === rarity && !ownedKeys.includes(c.key));
	if (pool.length > 0) {
		return { key: pool[Math.floor(Math.random() * pool.length)].key, actualRarity: rarity };
	}

	// If all colors of the target rarity are owned, try other rarities (epic > rare > legendary > uncommon)
	const fallbackOrder: Rarity[] = ['epic', 'rare', 'legendary', 'uncommon'];
	for (const fallbackRarity of fallbackOrder) {
		if (fallbackRarity === rarity) continue;
		const fallbackPool = NAME_COLOR_CATALOG.filter(
			(c) => c.rarity === fallbackRarity && !ownedKeys.includes(c.key)
		);
		if (fallbackPool.length > 0) {
			return {
				key: fallbackPool[Math.floor(Math.random() * fallbackPool.length)].key,
				actualRarity: fallbackRarity
			};
		}
	}

	return null;
}

function randomInRange(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const body = await request.json();
	const tierId = (body as { tier?: string }).tier ?? 'standard';

	if (!VALID_TIERS.has(tierId as CrateTierId)) {
		return json({ error: 'Invalid crate tier' }, { status: 400 });
	}

	const lootboxTier = CRATE_TIERS[tierId as CrateTierId];

	const result = await db.transaction(async (tx) => {
		const [userData] = await tx
			.select({
				gems: user.gems,
				baseCurrencyBalance: user.baseCurrencyBalance,
				cratesOpened: user.cratesOpened
			})
			.from(user)
			.where(eq(user.id, userId))
			.for('update')
			.limit(1);

		if (!userData) throw new Error('User not found');
		if (userData.gems < lootboxTier.cost)
			return { error: `Not enough Gems. Need ${lootboxTier.cost} Gems to open.` };

		const ownedItems = await tx.query.userInventory.findMany({
			where: and(eq(userInventory.userId, userId), eq(userInventory.itemType, 'namecolor')),
			columns: { itemKey: true }
		});
		const ownedKeys = ownedItems.map((i) => i.itemKey);

		const { tierIndex } = rollCrate(lootboxTier.rewards);
		const reward = lootboxTier.rewards[tierIndex];

		await tx
			.update(user)
			.set({
				gems: sql`${user.gems} - ${lootboxTier.cost}`,
				cratesOpened: sql`${user.cratesOpened} + 1`,
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		if (reward.type === 'buss') {
			const bussAmount = parseFloat(randomInRange(reward.min, reward.max).toFixed(2));
			await tx
				.update(user)
				.set({
					baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${bussAmount}`,
					updatedAt: new Date()
				})
				.where(eq(user.id, userId));
			return {
				reward: { type: 'buss' as const, bussAmount },
				newGems: userData.gems - lootboxTier.cost
			};
		}

		const colorResult = randomColorByRarity(reward.rarity!, ownedKeys);
		const bussConsolation = reward.min;

		if (colorResult) {
			await tx
				.insert(userInventory)
				.values({ userId, itemType: 'namecolor', itemKey: colorResult.key })
				.onConflictDoNothing();
		}

		await tx
			.update(user)
			.set({
				baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${bussConsolation}`,
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		const colorItem = NAME_COLOR_CATALOG.find((c) => c.key === colorResult?.key);
		return {
			reward: {
				type: 'color' as const,
				colorKey: colorResult?.key ?? null,
				colorLabel: colorItem?.label ?? null,
				colorRarity: colorResult?.actualRarity ?? reward.rarity,
				bussAmount: bussConsolation,
				alreadyOwned: !colorResult
			},
			newGems: userData.gems - lootboxTier.cost
		};
	});

	if ('error' in result) {
		return json({ error: result.error }, { status: 400 });
	}

	checkAndAwardAchievements(userId, ['shop'], { cratesOpened: (result as any).cratesOpened });

	return json(result);
};
