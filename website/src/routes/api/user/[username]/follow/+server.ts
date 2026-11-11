import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userFollow } from '$lib/server/db/schema';
import { and, count, eq } from 'drizzle-orm';
import { MAX_FOLLOWING } from '$lib/data/constants';

async function resolve(request: Request, username: string) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const [target] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.username, username))
		.limit(1);
	if (!target) throw error(404, 'User not found');

	return { followerId: Number(session.user.id), followingId: target.id };
}

export async function POST({ request, params }) {
	const { followerId, followingId } = await resolve(request, params.username);
	if (followerId === followingId) throw error(400, 'You cannot follow yourself');

	const [{ total }] = await db
		.select({ total: count() })
		.from(userFollow)
		.where(eq(userFollow.followerId, followerId));
	if (total >= MAX_FOLLOWING) {
		throw error(400, `You can follow at most ${MAX_FOLLOWING} players`);
	}

	await db.insert(userFollow).values({ followerId, followingId }).onConflictDoNothing();

	return json({ isFollowing: true });
}

export async function DELETE({ request, params }) {
	const { followerId, followingId } = await resolve(request, params.username);

	await db
		.delete(userFollow)
		.where(and(eq(userFollow.followerId, followerId), eq(userFollow.followingId, followingId)));

	return json({ isFollowing: false });
}
