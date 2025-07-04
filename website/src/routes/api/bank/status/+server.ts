import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { applyInterest } from '$lib/server/bank';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// Debug logging to understand authentication state
	console.log('Bank status request:', {
		userExists: !!locals.userSession,
		userId: locals.userSession?.id,
		userAgent: 'Hidden for brevity'
	});

	// Changed from locals.user to locals.userSession
	const user = locals.userSession;
	
	if (!user) {
		console.log('User not authenticated - returning 401');
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		console.log(`Fetching bank status for user ${user.id}`);
		const { bankBalance, nextInterestIn } = await applyInterest(Number(user.id));

		const [updatedUser] = await db.select().from(userTable).where(eq(userTable.id, Number(user.id)));

		const response = {
			bankBalance: Number(bankBalance),
			cashBalance: Number(updatedUser?.baseCurrencyBalance) || 0,
			nextInterestIn
		};

		console.log(`Bank status retrieved successfully for user ${user.id}`);
		return json(response);
	} catch (error) {
		console.error('Error fetching bank status:', error);
		return json({ error: 'Failed to retrieve bank status' }, { status: 500 });
	}
};