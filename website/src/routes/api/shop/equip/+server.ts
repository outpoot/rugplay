import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { user, userInventory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const EQUIPPABLE_ITEM_TYPES = {
	namecolor: 'nameColor',
	cardstyle: 'cardStyle',
	cardanimation: 'cardAnimation',
} as const;

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);
	const body = await request.json();
	const { itemType, itemKey } = body as { itemType: string; itemKey: string | null };

	const userColumn = EQUIPPABLE_ITEM_TYPES[itemType as keyof typeof EQUIPPABLE_ITEM_TYPES];
	if (!userColumn) {
		return json({ error: 'Invalid item type' }, { status: 400 });
	}

	if (itemKey !== null) {
		const owned = await db.query.userInventory.findFirst({
			where: and(
				eq(userInventory.userId, userId),
				eq(userInventory.itemType, itemType as typeof userInventory.$inferSelect.itemType),
				eq(userInventory.itemKey, itemKey),
			),
		});
		if (!owned) {
			return json({ error: 'You do not own this item' }, { status: 400 });
		}
	}

	await db
		.update(user)
		.set({ [userColumn]: itemKey, updatedAt: new Date() })
		.where(eq(user.id, userId));

	// The session used across the site is cached server-side for up to 5
	// minutes (see hooks.server.ts) for performance. Without clearing it
	// here, an equip would write to the DB correctly but the cached
	// session — which is what every other page reads nameColor/cardStyle/
	// cardAnimation from — would keep serving the pre-equip value until
	// the cache naturally expired, making the change look like it "didn't
	// take" outside of the page that made the request.
	try {
		const { clearUserCache } = await import('$lib/../hooks.server.js');
		clearUserCache(userId.toString());
	} catch (e) {
		console.warn('Failed to clear user cache after equip:', e);
	}

	return json({ success: true });
};
