import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const MAX_MEMBERS_PER_GROUP = 50;
const MAX_GROUPS_PER_USER = 50;

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const groupId = Number(params.id);
	const userId = Number(session.user.id);

	await db.transaction(async (tx) => {
		const [groupRow] = await tx
			.select({ id: group.id })
			.from(group)
			.where(eq(group.id, groupId))
			.limit(1);

		if (!groupRow) throw new Error('Group not found');

		const [existing] = await tx
			.select({ id: groupMember.id })
			.from(groupMember)
			.where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
			.limit(1);

		if (existing) throw new Error('Already a member');

		const [{ groupSize }] = await tx
			.select({ groupSize: count() })
			.from(groupMember)
			.where(eq(groupMember.groupId, groupId));

		if (Number(groupSize) >= MAX_MEMBERS_PER_GROUP) {
			throw new Error(`Group is full (max ${MAX_MEMBERS_PER_GROUP} members)`);
		}

		const [{ userMemberships }] = await tx
			.select({ userMemberships: count() })
			.from(groupMember)
			.where(eq(groupMember.userId, userId));

		if (Number(userMemberships) >= MAX_GROUPS_PER_USER) {
			throw new Error(`You can only be in up to ${MAX_GROUPS_PER_USER} groups`);
		}

		await tx.insert(groupMember).values({ groupId, userId, role: 'member' });
	});

	return json({ success: true });
};