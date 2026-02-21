import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';

export async function publishArcadeActivity(
	userId: number,
	amountWagered: number,
	won: boolean,
	game: string,
	delayMs: number = 0
): Promise<void> {
	if (amountWagered <= 0) return;
	if (amountWagered < 1000) return;

	const publishActivity = async () => {
		try {
			const [userInfo] = await db
				.select({
					username: user.username,
					image: user.image
				})
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);

			if (userInfo) {
				const activityData = {
					arcadeActivity: {
						username: userInfo.username,
						userImage: userInfo.image,
						userId: userId.toString(),
						game,
						amount: amountWagered,
						won,
						timestamp: Date.now()
					}
				};

				await redis.publish('arcade:activity', JSON.stringify(activityData));
			}
		} catch (error) {
			console.error('Failed to publish arcade activity:', error);
		}
	};

	if (delayMs > 0) {
		setTimeout(publishActivity, delayMs);
	} else {
		await publishActivity();
	}
}