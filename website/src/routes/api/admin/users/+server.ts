import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const [currentUser] = await db
		.select({ isAdmin: user.isAdmin })
		.from(user)
		.where(eq(user.id, Number(session.user.id)))
		.limit(1);

	if (!currentUser?.isAdmin) {
		throw error(403, 'Admin access required');
	}

	try {
		const users = await db
			.select({
				id: user.id,
				name: user.name,
				username: user.username,
				email: user.email,
				isAdmin: user.isAdmin,
				isBanned: user.isBanned,
				banReason: user.banReason,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(desc(user.createdAt));

		return json(users);
	} catch (e) {
		console.error('Failed to fetch users:', e);
		throw error(500, 'Internal server error');
	}
};
