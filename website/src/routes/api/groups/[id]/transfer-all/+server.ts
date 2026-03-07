import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { group, groupMember, user } from '$lib/server/db/schema';
import { eq, ne, and, inArray, sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import type { RequestHandler } from './$types';

const MAX_SINGLE_TRANSFER = 1_000_000_000;
const RATE_KEY = (uid: number, gid: number) => `group:xfer:${uid}:${gid}`;
const RATE_LIMIT_SEC = 10;

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const groupId = Number(params.id);
	const ownerId = Number(session.user.id);

	if (!groupId || !isFinite(groupId)) throw error(400, 'Invalid group');

	const rateKey = RATE_KEY(ownerId, groupId);
	const alreadyRunning = await redis.set(rateKey, '1', { NX: true, EX: RATE_LIMIT_SEC });
	if (alreadyRunning === null) {
		return json({ error: `Please wait ${RATE_LIMIT_SEC}s between bulk transfers` }, { status: 429 });
	}

	const body = await request.json().catch(() => null);
	const amount = Math.floor(Number(body?.amount));

	if (!amount || amount <= 0 || !isFinite(amount)) {
		return json({ error: 'Invalid amount' }, { status: 400 });
	}
	if (amount > MAX_SINGLE_TRANSFER) {
		return json({ error: 'Amount exceeds maximum allowed per operation' }, { status: 400 });
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
			if (groupRow.ownerId !== ownerId) throw new Error('Only the owner can distribute funds');

			const groupBalance = Number(groupRow.balance);
			if (amount > groupBalance) throw new Error('Insufficient group funds');

			const recipients = await tx
				.select({ userId: groupMember.userId })
				.from(groupMember)
				.where(and(eq(groupMember.groupId, groupId), ne(groupMember.userId, ownerId)));

			if (recipients.length === 0) throw new Error('No members to send to');

			const perMember = Math.floor(amount / recipients.length);
			if (perMember <= 0) throw new Error('Amount too small to split among members');

			const totalPayout = perMember * recipients.length;

			await tx
				.update(group)
				.set({ balance: String(groupBalance - totalPayout) })
				.where(eq(group.id, groupId));

			const userIds = recipients.map((r) => r.userId);

			await tx
				.update(user)
				.set({
					baseCurrencyBalance: sql`base_currency_balance + ${perMember}`,
					updatedAt: new Date()
				})
				.where(inArray(user.id, userIds));
		});
	} catch (e) {
		if (e instanceof Error) return json({ error: e.message }, { status: 400 });
		throw e;
	}

	return json({ success: true });
};