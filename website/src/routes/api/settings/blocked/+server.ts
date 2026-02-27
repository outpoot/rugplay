import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userBlock, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const userId = Number(session.user.id);

	const blocks = await db
		.select({
			id: userBlock.id,
			blockedId: userBlock.blockedId,
			username: user.username,
			name: user.name,
			image: user.image,
			createdAt: userBlock.createdAt
		})
		.from(userBlock)
		.innerJoin(user, eq(userBlock.blockedId, user.id))
		.where(eq(userBlock.blockerId, userId))
		.orderBy(userBlock.createdAt);

	return json({ blocks });
};
