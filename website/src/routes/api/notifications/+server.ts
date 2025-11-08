import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, desc, and, count, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const userId = Number(session.user.id);
	const unreadOnly = url.searchParams.get('unread_only') === 'true';

	try {
		const conditions = [eq(notifications.userId, userId)];
		if (unreadOnly) {
			conditions.push(eq(notifications.isRead, false));
		}

		const whereCondition = and(...conditions);

		const notificationsList = await db
			.select({
				id: notifications.id,
				type: notifications.type,
				title: notifications.title,
				message: notifications.message,
				link: notifications.link,
				isRead: notifications.isRead,
				createdAt: notifications.createdAt
			})
			.from(notifications)
			.where(whereCondition)
			.orderBy(desc(notifications.createdAt))
			.limit(50);

		const unreadCount = await db
			.select({ count: count() })
			.from(notifications)
			.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
			.then((result) => result[0]?.count || 0);

		return json({
			notifications: notificationsList,
			unreadCount
		});
	} catch (e) {
		console.error('Failed to fetch notificationss:', e);
		throw error(500, 'Failed to fetch notificationss');
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const userId = Number(session.user.id);
	const { markAsRead } = await request.json();

	if (typeof markAsRead !== 'boolean') {
		throw error(400, 'Invalid request body');
	}

	try {
		if (markAsRead) {
			await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
		}

		return json({ success: true });
	} catch (e) {
		console.error('Failed to update notifications:', e);
		throw error(500, 'Failed to update notifications');
	}
};
