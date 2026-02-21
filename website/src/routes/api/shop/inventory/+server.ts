import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { userInventory } from '$lib/server/db/schema';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Unauthorized');

	const userId = Number(session.user.id);

	const [userData, items] = await Promise.all([
		db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: { gems: true, founderBadge: true },
		}),
		db.query.userInventory.findMany({
			where: eq(userInventory.userId, userId),
			columns: { itemType: true, itemKey: true },
		}),
	]);

	return json({
		gems: userData?.gems ?? 0,
		founderBadge: userData?.founderBadge ?? false,
		nameColors: items.filter((i) => i.itemType === 'namecolor').map((i) => i.itemKey),
	});
};
