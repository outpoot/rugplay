import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import type { RequestHandler } from './$types';

const MAX_SINGLE_TRANSFER = 1_000_000_000;
const RATE_KEY = (uid: number, gid: number) => `group:xfer1:${uid}:${gid}`;
const RATE_LIMIT_SEC = 3;

export const POST: RequestHandler = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  const groupId = Number(params.id);
  const ownerId = Number(session.user.id);

  if (!groupId || !isFinite(groupId)) throw error(400, 'Invalid group');

  const rateKey = RATE_KEY(ownerId, groupId);
  const ok = await redis.set(rateKey, '1', { NX: true, EX: RATE_LIMIT_SEC });
  if (ok === null) {
    return json({ error: 'Sending too fast, slow down' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const targetUserId = Number(body?.userId);
  const amount = Math.floor(Number(body?.amount));

  if (!targetUserId || !isFinite(targetUserId)) {
    return json({ error: 'Invalid target user' }, { status: 400 });
  }
  if (!amount || amount <= 0 || !isFinite(amount)) {
    return json({ error: 'Invalid amount' }, { status: 400 });
  }
  if (amount > MAX_SINGLE_TRANSFER) {
    return json({ error: 'Amount exceeds maximum allowed' }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      const [groupRow] = await tx
        .select({ ownerId: group.ownerId, balance: group.balance })
        .from(group)
        .where(eq(group.id, groupId))
        .for('update')
        .limit(1);

      if (!groupRow) throw new Error('Group not found');
      if (groupRow.ownerId !== ownerId) throw new Error('Only the owner can transfer funds');

      const groupBalance = Number(groupRow.balance);
      if (amount > groupBalance) throw new Error('Insufficient group funds');

      // Target must be a member (owner can also send to themselves)
      const [membership] = await tx
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, targetUserId)))
        .limit(1);

      if (!membership) throw new Error('Target user is not a member of this group');

      await tx
        .update(group)
        .set({ balance: String(groupBalance - amount) })
        .where(eq(group.id, groupId));

      const [targetData] = await tx
        .select({ baseCurrencyBalance: user.baseCurrencyBalance })
        .from(user)
        .where(eq(user.id, targetUserId))
        .for('update')
        .limit(1);

      await tx
        .update(user)
        .set({
          baseCurrencyBalance: String(Number(targetData.baseCurrencyBalance) + amount),
          updatedAt: new Date(),
        })
        .where(eq(user.id, targetUserId));
    });
  } catch (e) {
    if (e instanceof Error) return json({ error: e.message }, { status: 400 });
    throw e;
  }

  return json({ success: true });
};