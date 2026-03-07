import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const groupId = Number(params.id);
  if (!groupId) throw error(400, 'Invalid group ID');

  const [groupRow] = await db
    .select({
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      ownerUsername: user.username,
      ownerImage: user.image,
      balance: group.balance,
      createdAt: group.createdAt,
    })
    .from(group)
    .innerJoin(user, eq(group.ownerId, user.id))
    .where(eq(group.id, groupId))
    .limit(1);

  if (!groupRow) throw error(404, 'Group not found');

  const members = await db
    .select({
      userId: groupMember.userId,
      username: user.username,
      userImage: user.image,
      role: groupMember.role,
      joinedAt: groupMember.joinedAt,
    })
    .from(groupMember)
    .innerJoin(user, eq(groupMember.userId, user.id))
    .where(eq(groupMember.groupId, groupId))
    .orderBy(groupMember.joinedAt);

  return { group: groupRow, members };
};