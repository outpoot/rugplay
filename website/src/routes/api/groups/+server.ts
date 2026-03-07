import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const GROUP_CREATION_COST = 150_000;
const MAX_MEMBERS = 50;
const MAX_GROUPS_PER_USER = 2;

// GET /api/groups — list all groups with member count + user's groups
export const GET: RequestHandler = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  const filter = url.searchParams.get('filter') ?? 'all'; // 'all' | 'mine'

  if (filter === 'mine') {
    if (!session?.user) throw error(401, 'Not authenticated');
    const userId = Number(session.user.id);

    const rows = await db
      .select({
        id: group.id,
        name: group.name,
        description: group.description,
        ownerId: group.ownerId,
        ownerUsername: user.username,
        balance: group.balance,
        createdAt: group.createdAt,
        role: groupMember.role,
        memberCount: sql<number>`(SELECT COUNT(*) FROM group_member WHERE group_id = ${group.id})`,
      })
      .from(groupMember)
      .innerJoin(group, eq(groupMember.groupId, group.id))
      .innerJoin(user, eq(group.ownerId, user.id))
      .where(eq(groupMember.userId, userId))
      .orderBy(desc(group.createdAt));

    return json(rows);
  }

  // all groups
  const rows = await db
    .select({
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      ownerUsername: user.username,
      balance: group.balance,
      createdAt: group.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM group_member WHERE group_id = ${group.id})`,
    })
    .from(group)
    .innerJoin(user, eq(group.ownerId, user.id))
    .orderBy(desc(group.createdAt))
    .limit(50);

  return json(rows);
};

// POST /api/groups — create a group (costs 150k)
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';

  if (!name || name.length < 3 || name.length > 50) {
    return json({ error: 'Group name must be between 3 and 50 characters' }, { status: 400 });
  }
  if (description.length > 200) {
    return json({ error: 'Description too long' }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    // Check how many groups the user already owns
    const [owned] = await tx
      .select({ cnt: count() })
      .from(group)
      .where(eq(group.ownerId, userId));

    if (Number(owned.cnt) >= MAX_GROUPS_PER_USER) {
      throw new Error(`You can only own up to ${MAX_GROUPS_PER_USER} groups`);
    }

    const [userData] = await tx
      .select({ baseCurrencyBalance: user.baseCurrencyBalance })
      .from(user)
      .where(eq(user.id, userId))
      .for('update')
      .limit(1);

    const balance = Number(userData?.baseCurrencyBalance ?? 0);
    if (balance < GROUP_CREATION_COST) {
      throw new Error(`Insufficient funds. Creating a group costs $${GROUP_CREATION_COST.toLocaleString()}`);
    }

    await tx
      .update(user)
      .set({
        baseCurrencyBalance: String(balance - GROUP_CREATION_COST),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    const [newGroup] = await tx
      .insert(group)
      .values({ name, description: description || null, ownerId: userId })
      .returning({ id: group.id });

    await tx.insert(groupMember).values({
      groupId: newGroup.id,
      userId,
      role: 'owner',
    });

    return newGroup;
  });

  return json({ success: true, groupId: result.id });
};