import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { formatValue } from '$lib/utils';
import type { PageServerLoad, Actions } from './$types';

async function applyInterest(userId: number) {
	const [user] = await db.select().from(userTable).where(eq(userTable.id, userId));
	if (!user || user.bankBalance === null || Number(user.bankBalance) <= 0) {
		const nextInterestIn = user?.nextInterestAt
			? new Date(user.nextInterestAt).getTime() - Date.now()
			: 24 * 60 * 60 * 1000;
		return {
			bankBalance: user?.bankBalance || 0,
			nextInterestIn: Math.max(0, nextInterestIn)
		};
	}

	const now = new Date();
	const nextInterestAt = user.nextInterestAt ? new Date(user.nextInterestAt) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

	if (isNaN(nextInterestAt.getTime()) || now < nextInterestAt) {
		return {
			bankBalance: Number(user.bankBalance),
			nextInterestIn: Math.max(0, nextInterestAt.getTime() - now.getTime())
		};
	}

	// Interest is due
	let newBalance = Number(user.bankBalance);
	newBalance += newBalance * 0.10;

	const newNextInterestAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	await db.update(userTable).set({
		bankBalance: newBalance.toString(),
		nextInterestAt: newNextInterestAt
	}).where(eq(userTable.id, userId));

	return {
		bankBalance: newBalance,
		nextInterestIn: 24 * 60 * 60 * 1000
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return { bankBalance: 0, cashBalance: 0, nextInterestIn: 0 };
	}

	try {
		const { bankBalance, nextInterestIn } = await applyInterest(Number(user.id));
		const [currentUser] = await db.select({ cashBalance: userTable.baseCurrencyBalance }).from(userTable).where(eq(userTable.id, Number(user.id)));
		
		return {
			bankBalance: Number(bankBalance),
			cashBalance: Number(currentUser?.cashBalance) || 0,
			nextInterestIn
		};
	} catch (error) {
		console.error("Error in /bank page load:", error);
		return { bankBalance: 0, cashBalance: 0, nextInterestIn: 0, error: "Could not load bank data." };
	}
};

export const actions: Actions = {
	deposit: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const amount = parseFloat(data.get('amount') as string);

		if (isNaN(amount) || amount <= 0) return fail(400, { error: 'Invalid deposit amount' });

		const [currentUser] = await db.select().from(userTable).where(eq(userTable.id, Number(user.id)));
		if (!currentUser || Number(currentUser.baseCurrencyBalance) < amount) {
			return fail(400, { error: 'Insufficient funds' });
		}

		await db.update(userTable).set({
			baseCurrencyBalance: sql`${userTable.baseCurrencyBalance} - ${amount}`,
			bankBalance: sql`${userTable.bankBalance} + ${amount}`
		}).where(eq(userTable.id, Number(user.id)));
		
		return { success: true, message: `Deposited ${formatValue(amount)}` };
	},

	withdraw: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const amount = parseFloat(data.get('amount') as string);

		if (isNaN(amount) || amount <= 0) return fail(400, { error: 'Invalid withdrawal amount' });
		
		const { bankBalance: currentBankBalance } = await applyInterest(Number(user.id));
		if(Number(currentBankBalance) < amount) {
			return fail(400, { error: 'Insufficient bank balance' });
		}
		
		await db.update(userTable).set({
			baseCurrencyBalance: sql`${userTable.baseCurrencyBalance} + ${amount}`,
			bankBalance: sql`${userTable.bankBalance} - ${amount}`
		}).where(eq(userTable.id, Number(user.id)));

		return { success: true, message: `Withdrew ${formatValue(amount)}` };
	}
};