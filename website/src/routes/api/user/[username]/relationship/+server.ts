import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userBlock, userFollow } from '$lib/server/db/schema';
import { and, count, eq } from 'drizzle-orm';

// Everything a profile needs to know about "you and this player" in one call:
// follower counts for anyone, plus whether the viewer follows or blocks them.
export async function GET({ request, params }) {
	const [target] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.username, params.username))
		.limit(1);
	if (!target) throw error(404, 'User not found');

	const session = await auth.api.getSession({ headers: request.headers });
	const viewerId = session?.user ? Number(session.user.id) : null;
	const isSelf = viewerId === target.id;

	const [[{ followers }], [{ following }], followRow, blockRow] = await Promise.all([
		db.select({ followers: count() }).from(userFollow).where(eq(userFollow.followingId, target.id)),
		db.select({ following: count() }).from(userFollow).where(eq(userFollow.followerId, target.id)),
		viewerId && !isSelf
			? db
					.select({ followerId: userFollow.followerId })
					.from(userFollow)
					.where(and(eq(userFollow.followerId, viewerId), eq(userFollow.followingId, target.id)))
					.limit(1)
			: [],
		viewerId && !isSelf
			? db
					.select({ id: userBlock.id })
					.from(userBlock)
					.where(and(eq(userBlock.blockerId, viewerId), eq(userBlock.blockedId, target.id)))
					.limit(1)
			: []
	]);

	return json({
		followers,
		following,
		isFollowing: followRow.length > 0,
		isBlocked: blockRow.length > 0
	});
}
