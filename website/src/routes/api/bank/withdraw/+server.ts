import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { applyInterest } from '$lib/server/bank';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { amount, resetInterestTimer } = body;

	if (typeof amount !== 'number' || amount <= 0) {
		return json({ error: 'Invalid withdrawal amount' }, { status: 400 });
	}

	try {
		const result = await db.transaction(async (tx) => {
			const { bankBalance: currentBankBalance } = await applyInterest(Number(user.id));

			if (Number(currentBankBalance) < amount) {
				tx.rollback();
				return { error: 'Insufficient bank balance' };
			}

			const updates: Record<string, unknown> = {
				baseCurrencyBalance: sql`${userTable.baseCurrencyBalance} + ${amount}`,
				bankBalance: sql`${userTable.bankBalance} - ${amount}`,
				lastBankActivity: new Date()
			};

			// Reset interest timer if requested
			if (resetInterestTimer) {
				updates['nextInterestAt'] = new Date(Date.now() + 24 * 60 * 60 * 1000);
			}

			await tx.update(userTable).set(updates).where(eq(userTable.id, Number(user.id)));

			const { bankBalance: newBankBalance, nextInterestIn } = await applyInterest(Number(user.id));

			const [refetchedUser] = await tx
				.select({ cashBalance: userTable.baseCurrencyBalance })
				.from(userTable)
				.where(eq(userTable.id, Number(user.id)));

			return {
				success: true,
				newBankBalance: Number(newBankBalance),
				newCashBalance: Number(refetchedUser.cashBalance),
				nextInterestIn
			};
		});

		if (result.error) {
			return json({ error: result.error }, { status: 400 });
		}

		return json(result);
	} catch (error) {
		console.error('Withdrawal error:', error);
		return json({ error: 'An error occurred during the withdrawal.' }, { status: 500 });
	}
};