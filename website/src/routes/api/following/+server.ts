import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userFollow } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const players = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			nameColor: user.nameColor
		})
		.from(userFollow)
		.innerJoin(user, eq(userFollow.followingId, user.id))
		.where(eq(userFollow.followerId, Number(session.user.id)))
		.orderBy(desc(userFollow.createdAt));

	return json({ players });
}
