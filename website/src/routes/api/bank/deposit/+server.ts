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
    const { amount, preserveInterestTimer = true } = body;

	if (typeof amount !== 'number' || amount <= 0) {
		return json({ error: 'Invalid deposit amount' }, { status: 400 });
	}

	try {
		const result = await db.transaction(async (tx) => {
			const [currentUser] = await tx
				.select({
					id: userTable.id,
					baseCurrencyBalance: userTable.baseCurrencyBalance
				})
				.from(userTable)
				.where(eq(userTable.id, Number(user.id)))
				.for('update');

			if (!currentUser || Number(currentUser.baseCurrencyBalance) < amount) {
				tx.rollback();
				return { error: 'Insufficient funds' };
			}

			const updates: Record<string, unknown> = {
				baseCurrencyBalance: sql`${userTable.baseCurrencyBalance} - ${amount}`,
				bankBalance: sql`${userTable.bankBalance} + ${amount}`,
				lastBankActivity: new Date()
			};

			// Reset interest timer only if preserveInterestTimer is false or undefined
			if (!preserveInterestTimer) {
				updates['nextInterestAt'] = new Date(Date.now() + 24 * 60 * 60 * 1000);
			}

			await tx.update(userTable).set(updates).where(eq(userTable.id, Number(user.id)));

			const { bankBalance, nextInterestIn } = await applyInterest(Number(user.id));

			const [refetchedUser] = await tx
				.select({ cashBalance: userTable.baseCurrencyBalance })
				.from(userTable)
				.where(eq(userTable.id, Number(user.id)));

			return {
				success: true,
				newBankBalance: Number(bankBalance),
				newCashBalance: Number(refetchedUser.cashBalance),
				nextInterestIn
			};
		});

		if (result.error) {
			return json({ error: result.error }, { status: 400 });
		}

		return json(result);
	} catch (error) {
		console.error('Deposit error:', error);
		return json({ error: 'An error occurred during the deposit.' }, { status: 500 });
	}
};