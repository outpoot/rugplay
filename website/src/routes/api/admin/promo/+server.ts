import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { promoCode, promoCodeRedemption } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || !session.user.isAdmin) {
		throw error(403, 'Admin access required');
	}

	const { code, description, rewardAmount, maxUses, expiresAt } = await request.json();

	if (!code || !rewardAmount) {
		return json({ error: 'Code and reward amount are required' }, { status: 400 });
	}

	const normalizedCode = code.trim().toUpperCase();
	const userId = Number(session.user.id);

	const [existingCode] = await db
		.select({ id: promoCode.id })
		.from(promoCode)
		.where(eq(promoCode.code, normalizedCode))
		.limit(1);

	if (existingCode) {
		return json({ error: 'Promo code already exists' }, { status: 400 });
	}

	const [newPromoCode] = await db
		.insert(promoCode)
		.values({
			code: normalizedCode,
			description: description || null,
			rewardAmount: Number(rewardAmount).toFixed(8),
			maxUses: maxUses || null,
			expiresAt: expiresAt ? new Date(expiresAt) : null,
			createdBy: userId
		})
		.returning();

	return json({
		success: true,
		promoCode: {
			id: newPromoCode.id,
			code: newPromoCode.code,
			description: newPromoCode.description,
			rewardAmount: Number(newPromoCode.rewardAmount),
			maxUses: newPromoCode.maxUses,
			expiresAt: newPromoCode.expiresAt
		}
	});
};

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || !session.user.isAdmin) {
		throw error(403, 'Admin access required');
	}

	const rows = await db
		.select({
			id: promoCode.id,
			code: promoCode.code,
			description: promoCode.description,
			rewardAmount: promoCode.rewardAmount,
			maxUses: promoCode.maxUses,
			isActive: promoCode.isActive,
			createdAt: promoCode.createdAt,
			expiresAt: promoCode.expiresAt,
			usedCount: count(promoCodeRedemption.id).as('usedCount')
		})
		.from(promoCode)
		.leftJoin(promoCodeRedemption, eq(promoCode.id, promoCodeRedemption.promoCodeId))
		.groupBy(promoCode.id);

	return json({
		codes: rows.map((pc) => ({
			...pc,
			rewardAmount: Number(pc.rewardAmount)
		}))
	});
};
