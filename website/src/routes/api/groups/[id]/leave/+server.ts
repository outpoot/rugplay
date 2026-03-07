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
  const userId = Number(session.user.id);

  const [groupRow] = await db
    .select({ ownerId: group.ownerId })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);

  if (!groupRow) throw error(404, 'Group not found');
  if (groupRow.ownerId === userId) {
    return json({ error: 'Owner cannot leave. Disband the group instead.' }, { status: 400 });
  }

  await db
    .delete(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)));

  return json({ success: true });
};