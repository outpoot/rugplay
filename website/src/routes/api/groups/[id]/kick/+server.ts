import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  const groupId = Number(params.id);
  const ownerId = Number(session.user.id);

  const body = await request.json().catch(() => null);
  const targetUserId = Number(body?.userId);

  if (!targetUserId) return json({ error: 'Invalid user' }, { status: 400 });
  if (targetUserId === ownerId) return json({ error: 'Cannot kick yourself' }, { status: 400 });

  const [groupRow] = await db
    .select({ ownerId: group.ownerId })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);

  if (!groupRow) throw error(404, 'Group not found');
  if (groupRow.ownerId !== ownerId) throw error(403, 'Only the owner can kick members');

  await db
    .delete(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, targetUserId)));

  return json({ success: true });
};