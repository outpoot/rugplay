import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const MAX_MEMBERS = 50;

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

    const [{ cnt }] = await tx
      .select({ cnt: count() })
      .from(groupMember)
      .where(eq(groupMember.groupId, groupId));

    if (Number(cnt) >= MAX_MEMBERS) throw new Error(`Group is full (max ${MAX_MEMBERS} members)`);

    await tx.insert(groupMember).values({ groupId, userId, role: 'member' });
  });

  return json({ success: true });
};