import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, accountDeletionRequest } from '$lib/server/db/schema';
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
		// A pending deletion request bans the user as a side effect, so unbanning without
		// clearing the request would leave the account looking healthy until the scheduled
		// job hard-deletes it. Delete the row rather than marking it processed: the
		// duplicate check in /api/settings/delete-account ignores is_processed, so a
		// leftover row would permanently block the user from deleting their own account.
		const cancelledDeletionRequests = await db.transaction(async (tx) => {
			const cancelled = await tx
				.delete(accountDeletionRequest)
				.where(eq(accountDeletionRequest.userId, userId))
				.returning({ id: accountDeletionRequest.id });

			await tx
				.update(user)
				.set({
					isBanned: false,
					banReason: null,
					updatedAt: new Date()
				})
				.where(eq(user.id, userId));

			return cancelled;
		});

		return json({
			success: true,
			deletionRequestCancelled: cancelledDeletionRequests.length > 0
		});
	} catch (e) {
		console.error('Failed to unban user:', e);
		throw error(500, 'Internal server error');
	}
};
