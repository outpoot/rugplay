import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { publishGamblingActivity } from '$lib/server/gambling-activity';
import { validateBetAmount } from '$lib/utils';
import type { RequestHandler } from './$types';

interface DiceRequest {
	selectedNumber: number;
	amount: number;
}

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const { selectedNumber, amount }: DiceRequest = await request.json();

		if (
			!selectedNumber ||
			selectedNumber < 1 ||
			selectedNumber > 6 ||
			!Number.isInteger(selectedNumber)
		) {
			return json({ error: 'Invalid number selection' }, { status: 400 });
		}

		const roundedBet = validateBetAmount(amount);

		const userId = Number(session.user.id);

		const result = await db.transaction(async (tx) => {
			const [userData] = await tx
				.select({
					baseCurrencyBalance: user.baseCurrencyBalance,
					gamblingLosses: user.gamblingLosses,
					gamblingWins: user.gamblingWins
				})
				.from(user)
				.where(eq(user.id, userId))
				.for('update')
				.limit(1);

			const currentBalance = Number(userData.baseCurrencyBalance);
			const roundedBalance = Math.round(currentBalance * 100000000) / 100000000;

			if (roundedBet > roundedBalance) {
				throw new Error(
					`Insufficient funds. You need $${roundedBet.toFixed(2)} but only have $${roundedBalance.toFixed(2)}`
				);
			}

			const gameResult = randomInt(1, 6);
			const won = gameResult === selectedNumber;

			const multiplier = 3;
			const payout = won ? roundedBet * multiplier : 0;
			const newBalance = roundedBalance - roundedBet + payout;

			// Calculate gambling stats
			const netResult = payout - roundedBet;
			const isWin = netResult > 0;

			const updateData: any = {
				baseCurrencyBalance: newBalance.toFixed(8),
				updatedAt: new Date()
			};

			if (isWin) {
				updateData.gamblingWins = `${Number(userData.gamblingWins || 0) + netResult}`;
			} else {
				updateData.gamblingLosses = `${Number(userData.gamblingLosses || 0) + Math.abs(netResult)}`;
			}

			await tx.update(user).set(updateData).where(eq(user.id, userId));

			return {
				won,
				result: gameResult,
				newBalance,
				payout,
				amountWagered: roundedBet
			};
		});

		await publishGamblingActivity(
			userId,
			result.won ? result.payout : result.amountWagered,
			result.won,
			'dice',
			2000
		);

		return json(result);
	} catch (e) {
		console.error('Dice API error:', e);
		const errorMessage = e instanceof Error ? e.message : 'Internal server error';
		return json({ error: errorMessage }, { status: 400 });
	}
};
