import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq, desc, sql, ilike } from 'drizzle-orm';
import type { RequestHandler } from './$types';

async function requireAdmin(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const [currentUser] = await db
		.select({ isAdmin: user.isAdmin })
		.from(user)
		.where(eq(user.id, Number(session.user.id)))
		.limit(1);

	if (!currentUser?.isAdmin) throw error(403, 'Admin access required');
}

export const GET: RequestHandler = async ({ request, url }) => {
	await requireAdmin(request);

	const search = url.searchParams.get('search')?.trim() ?? '';
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200);

	const rows = await db
		.select({
			id: group.id,
			name: group.name,
			description: group.description,
			ownerId: group.ownerId,
			ownerUsername: user.username,
			ownerEmail: user.email,
			balance: group.balance,
			createdAt: group.createdAt,
			memberCount: sql<number>`(SELECT COUNT(*) FROM group_member WHERE group_id = ${group.id})`,
		})
		.from(group)
		.innerJoin(user, eq(group.ownerId, user.id))
		.where(search ? ilike(group.name, `%${search}%`) : undefined)
		.orderBy(desc(group.createdAt))
		.limit(limit);

	return json({ groups: rows });
};

export const DELETE: RequestHandler = async ({ request, url }) => {
	await requireAdmin(request);

	const groupId = Number(url.searchParams.get('id'));
	if (!groupId || !isFinite(groupId)) {
		return json({ error: 'Invalid group ID' }, { status: 400 });
	}

	const [groupRow] = await db
		.select({ ownerId: group.ownerId, balance: group.balance })
		.from(group)
		.where(eq(group.id, groupId))
		.limit(1);

	if (!groupRow) throw error(404, 'Group not found');

	await db.transaction(async (tx) => {
		const remaining = Number(groupRow.balance);
		if (remaining > 0) {
			const [ownerData] = await tx
				.select({ baseCurrencyBalance: user.baseCurrencyBalance })
				.from(user)
				.where(eq(user.id, groupRow.ownerId))
				.for('update')
				.limit(1);

			if (ownerData) {
				await tx
					.update(user)
					.set({
						baseCurrencyBalance: String(Number(ownerData.baseCurrencyBalance) + remaining),
						updatedAt: new Date(),
					})
					.where(eq(user.id, groupRow.ownerId));
			}
		}

		await tx.delete(group).where(eq(group.id, groupId));
	});

	return json({ success: true });
};