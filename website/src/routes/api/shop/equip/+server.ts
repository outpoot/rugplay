import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { user, userInventory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const body = await request.json();
	const { itemType, itemKey } = body as { itemType: string; itemKey: string | null };

	if (itemType !== 'namecolor') {
		return json({ error: 'Invalid item type' }, { status: 400 });
	}

	if (itemKey !== null) {
		const owned = await db.query.userInventory.findFirst({
			where: and(
				eq(userInventory.userId, userId),
				eq(userInventory.itemType, 'namecolor'),
				eq(userInventory.itemKey, itemKey),
			),
		});
		if (!owned) {
			return json({ error: 'You do not own this item' }, { status: 400 });
		}
	}

	await db
		.update(user)
		.set({ nameColor: itemKey, updatedAt: new Date() })
		.where(eq(user.id, userId));

	return json({ success: true });
};
