import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';

export async function publishGamblingActivity(
	userId: number,
	amountWagered: number,
	won: boolean,
	game: string,
	delayMs: number = 0
): Promise<void> {
	if (amountWagered <= 0) return;

	// Delay publication to allow frontend animations to complete
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
					gamblingActivity: {
						username: userInfo.username,
						userImage: userInfo.image,
						userId: userId.toString(),
						game,
						amount: amountWagered,
						won,
						timestamp: Date.now()
					}
				};

				await redis.publish('gambling:activity', JSON.stringify(activityData));
			}
		} catch (error) {
			console.error('Failed to publish gambling activity:', error);
		}
	};

	if (delayMs > 0) {
		setTimeout(publishActivity, delayMs);
	} else {
		await publishActivity();
	}
}