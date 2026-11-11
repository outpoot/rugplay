import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userFollow } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { FOLLOW_LIST_LIMIT } from '$lib/data/constants';

export async function GET({ params, url }) {
	const type = url.searchParams.get('type') === 'following' ? 'following' : 'followers';

	const [target] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.username, params.username))
		.limit(1);
	if (!target) throw error(404, 'User not found');

	// "following": rows where the profile is the follower, joined to who they follow.
	const [mine, theirs] =
		type === 'following'
			? [userFollow.followerId, userFollow.followingId]
			: [userFollow.followingId, userFollow.followerId];

	const players = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			nameColor: user.nameColor
		})
		.from(userFollow)
		.innerJoin(user, eq(theirs, user.id))
		.where(eq(mine, target.id))
		.orderBy(desc(userFollow.createdAt))
		.limit(FOLLOW_LIST_LIMIT);

	return json({ type, players });
}
