import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/groups/[id] — group details + members
export const GET: RequestHandler = async ({ params }) => {
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

  return json({ ...groupRow, members });
};

// DELETE /api/groups/[id] — disband group (owner only, no refund)
export const DELETE: RequestHandler = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  const groupId = Number(params.id);
  const userId = Number(session.user.id);

  const [groupRow] = await db
    .select({ ownerId: group.ownerId, balance: group.balance })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);

  if (!groupRow) throw error(404, 'Group not found');
  if (groupRow.ownerId !== userId) throw error(403, 'Only the owner can disband the group');

  // Return remaining balance to owner before disbanding
  await db.transaction(async (tx) => {
    const remaining = Number(groupRow.balance);
    if (remaining > 0) {
      const [ownerData] = await tx
        .select({ baseCurrencyBalance: user.baseCurrencyBalance })
        .from(user)
        .where(eq(user.id, userId))
        .for('update')
        .limit(1);

      await tx
        .update(user)
        .set({
          baseCurrencyBalance: String(Number(ownerData.baseCurrencyBalance) + remaining),
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));
    }

    await tx.delete(group).where(eq(group.id, groupId));
  });

  return json({ success: true });
};