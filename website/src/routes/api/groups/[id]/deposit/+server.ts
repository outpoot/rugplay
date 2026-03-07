import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw error(401, 'Not authenticated');

  const groupId = Number(params.id);
  const userId = Number(session.user.id);

  const body = await request.json().catch(() => null);
  const amount = Math.floor(Number(body?.amount));

  if (!amount || amount <= 0 || !isFinite(amount)) {
    return json({ error: 'Invalid amount' }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    const [groupRow] = await tx
      .select({ ownerId: group.ownerId, balance: group.balance })
      .from(group)
      .where(eq(group.id, groupId))
      .limit(1);

    if (!groupRow) throw new Error('Group not found');
    if (groupRow.ownerId !== userId) throw new Error('Only the owner can deposit funds');

    const [userData] = await tx
      .select({ baseCurrencyBalance: user.baseCurrencyBalance })
      .from(user)
      .where(eq(user.id, userId))
      .for('update')
      .limit(1);

    const userBalance = Number(userData.baseCurrencyBalance);
    if (amount > userBalance) throw new Error('Insufficient funds');

    await tx
      .update(user)
      .set({ baseCurrencyBalance: String(userBalance - amount), updatedAt: new Date() })
      .where(eq(user.id, userId));

    await tx
      .update(group)
      .set({ balance: String(Number(groupRow.balance) + amount) })
      .where(eq(group.id, groupId));
  });

  return json({ success: true });
};