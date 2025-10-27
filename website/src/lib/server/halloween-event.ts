import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';

const COMMUNITY_GOAL = 200000000; // $200M
const REDIS_KEY = 'halloween:community_losses';

export async function publishHalloweenEventUpdate(
	userId: number,
	amountWagered: number,
	won: boolean,
	game: string
): Promise<void> {
	if (amountWagered <= 0) return;

	try {
		if (!won && amountWagered > 0) {
			await redis.incrByFloat(REDIS_KEY, amountWagered);
		}

		const totalCommunityLosses = Number(await redis.get(REDIS_KEY) || 0);
		const goalReached = totalCommunityLosses >= COMMUNITY_GOAL;

		const eventData: any = {
			totalCommunityLosses,
			goal: COMMUNITY_GOAL,
			goalReached
		};

		if (amountWagered > 0) {
			const [userInfo] = await db
				.select({
					username: user.username,
					image: user.image
				})
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);

			if (userInfo) {
				eventData.gamblingActivity = {
					username: userInfo.username,
					userImage: userInfo.image,
					userId: userId.toString(),
					game,
					amount: amountWagered,
					won,
					timestamp: Date.now()
				};
			}
		}

		await redis.publish('halloween:event', JSON.stringify(eventData));
	} catch (error) {
		console.error('Failed to publish Halloween event update:', error);
	}
}