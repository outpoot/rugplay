import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const INTEREST_RATE = 0.10; // 10% daily interest
const INTEREST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// This function is now EXPORTED from a central utility file so it can be shared.
export async function applyInterest(userId: number) {
	const [user] = await db.select().from(userTable).where(eq(userTable.id, userId));

	if (!user || user.bankBalance === null || Number(user.bankBalance) <= 0) {
		const nextInterestIn = user?.lastBankActivity
			? INTEREST_INTERVAL_MS - (new Date().getTime() - new Date(user.lastBankActivity).getTime())
			: INTEREST_INTERVAL_MS;
		return {
			bankBalance: user?.bankBalance || 0,
			nextInterestIn: Math.max(0, nextInterestIn)
		};
	}

	const now = new Date();
	const lastActivity = user.lastBankActivity || user.createdAt; // Use createdAt as fallback for first interest
	const timeDiff = now.getTime() - lastActivity.getTime();

	if (timeDiff >= INTEREST_INTERVAL_MS) {
		const periods = Math.floor(timeDiff / INTEREST_INTERVAL_MS);
		let newBalance = Number(user.bankBalance);

		for (let i = 0; i < periods; i++) {
			newBalance += newBalance * INTEREST_RATE;
		}

		await db
			.update(userTable)
			.set({
				bankBalance: newBalance.toString(),
				lastBankActivity: now
			})
			.where(eq(userTable.id, userId));

		const nextInterestIn = INTEREST_INTERVAL_MS - (timeDiff % INTEREST_INTERVAL_MS);

		return { bankBalance: newBalance.toString(), nextInterestIn };
	}

	const nextInterestIn = INTEREST_INTERVAL_MS - timeDiff;
	return { bankBalance: user.bankBalance, nextInterestIn: Math.max(0, nextInterestIn) };
}