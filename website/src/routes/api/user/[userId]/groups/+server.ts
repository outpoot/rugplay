import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET({ params }: { params: { userId: string } }) {
	const { userId } = params;
	if (!userId) throw error(400, 'User ID or username is required');

	const isNumeric = /^\d+$/.test(userId);

	const userData = await db.query.user.findFirst({
		where: isNumeric ? eq(user.id, parseInt(userId)) : eq(user.username, userId),
		columns: { id: true },
	});

	if (!userData) throw error(404, 'User not found');

	const rows = await db
		.select({
			id: group.id,
			name: group.name,
			description: group.description,
			ownerId: group.ownerId,
			ownerUsername: user.username,
			balance: group.balance,
			role: groupMember.role,
			memberCount: sql<number>`(SELECT COUNT(*) FROM group_member WHERE group_id = ${group.id})`,
		})
		.from(groupMember)
		.innerJoin(group, eq(groupMember.groupId, group.id))
		.innerJoin(user, eq(group.ownerId, user.id))
		.where(eq(groupMember.userId, userData.id))
		.orderBy(group.name);

	return json({ groups: rows });
}