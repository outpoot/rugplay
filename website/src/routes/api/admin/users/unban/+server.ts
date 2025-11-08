import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const authSession = await auth.api.getSession({ headers: request.headers });

	if (!authSession?.user) {
		throw error(401, 'Not authenticated');
	}

	const [currentUser] = await db
		.select({ isAdmin: user.isAdmin })
		.from(user)
		.where(eq(user.id, Number(authSession.user.id)))
		.limit(1);

	if (!currentUser?.isAdmin) {
		throw error(403, 'Admin access required');
	}

	const { userId } = await request.json();

	if (!userId) {
		throw error(400, 'User ID is required');
	}

	try {
		await db
			.update(user)
			.set({
				isBanned: false,
				banReason: null,
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		return json({ success: true });
	} catch (e) {
		console.error('Failed to unban user:', e);
		throw error(500, 'Internal server error');
	}
};
