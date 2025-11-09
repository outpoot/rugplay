import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, promoCode, promoCodeRedemption } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const { code } = await request.json();

	if (!code || typeof code !== 'string' || code.trim().length === 0) {
		return json({ t: 'PR', error: 'Promo code is required' }, { status: 400 });
	}

	const normalizedCode = code.trim().toUpperCase();
	const userId = Number(session.user.id);

	return await db.transaction(async (tx) => {
		const [promoData] = await tx
			.select({
				id: promoCode.id,
				code: promoCode.code,
				rewardAmount: promoCode.rewardAmount,
				maxUses: promoCode.maxUses,
				expiresAt: promoCode.expiresAt,
				isActive: promoCode.isActive,
				description: promoCode.description
			})
			.from(promoCode)
			.where(eq(promoCode.code, normalizedCode))
			.for('update')
			.limit(1);

		if (!promoData) {
			return json({ t: 'IPC', error: 'Invalid promo code' }, { status: 400 });
		}

		if (!promoData.isActive) {
			return json({ t: 'NA', error: 'This promo code is no longer active' }, { status: 400 });
		}

		if (promoData.expiresAt && new Date() > promoData.expiresAt) {
			return json({ t: 'EX', error: 'This promo code has expired' }, { status: 400 });
		}

		const [existingRedemption] = await tx
			.select({ id: promoCodeRedemption.id })
			.from(promoCodeRedemption)
			.where(
				and(
					eq(promoCodeRedemption.userId, userId),
					eq(promoCodeRedemption.promoCodeId, promoData.id)
				)
			)
			.limit(1);

		if (existingRedemption) {
			return json({ t: 'AU', error: 'You have already used this promo code' }, { status: 400 });
		}

		if (promoData.maxUses !== null) {
			const [{ totalUses }] = await tx
				.select({ totalUses: count() })
				.from(promoCodeRedemption)
				.where(eq(promoCodeRedemption.promoCodeId, promoData.id));

			if (totalUses >= promoData.maxUses) {
				return json(
					{ t: 'UL', error: 'This promo code has reached its usage limit' },
					{ status: 400 }
				);
			}
		}

		const [userData] = await tx
			.select({ baseCurrencyBalance: user.baseCurrencyBalance })
			.from(user)
			.where(eq(user.id, userId))
			.for('update')
			.limit(1);

		if (!userData) {
			throw error(404, 'User not found');
		}

		const currentBalance = Number(userData.baseCurrencyBalance || 0);
		const rewardAmount = Number(promoData.rewardAmount);
		const newBalance = currentBalance + rewardAmount;

		await tx
			.update(user)
			.set({
				baseCurrencyBalance: newBalance.toFixed(8),
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		await tx.insert(promoCodeRedemption).values({
			userId,
			promoCodeId: promoData.id,
			rewardAmount: rewardAmount.toFixed(8)
		});

		return json({
			success: true,
			message:
				promoData.description || `Promo code redeemed! You received $${rewardAmount.toFixed(2)}`,
			rewardAmount,
			newBalance,
			code: promoData.code
		});
	});
};
