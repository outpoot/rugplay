import { Webhooks } from '@polar-sh/sveltekit';
import {
	POLAR_WEBHOOK_SECRET,
} from '$env/static/private';
import {
	PUBLIC_POLAR_PRODUCT_GEMS_500,
	PUBLIC_POLAR_PRODUCT_GEMS_1300,
	PUBLIC_POLAR_PRODUCT_GEMS_2800,
	PUBLIC_POLAR_PRODUCT_GEMS_8000,
} from '$env/static/public';
import { db } from '$lib/server/db';
import { user, gemTransactions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

const PRODUCT_GEMS_MAP: Record<string, number> = {
	[PUBLIC_POLAR_PRODUCT_GEMS_500]: 500,
	[PUBLIC_POLAR_PRODUCT_GEMS_1300]: 1300,
	[PUBLIC_POLAR_PRODUCT_GEMS_2800]: 2800,
	[PUBLIC_POLAR_PRODUCT_GEMS_8000]: 8000,
};

const PRODUCT_USD_MAP: Record<string, number> = {
	[PUBLIC_POLAR_PRODUCT_GEMS_500]: 199,
	[PUBLIC_POLAR_PRODUCT_GEMS_1300]: 499,
	[PUBLIC_POLAR_PRODUCT_GEMS_2800]: 999,
	[PUBLIC_POLAR_PRODUCT_GEMS_8000]: 2499,
};

export const POST = Webhooks({
	webhookSecret: POLAR_WEBHOOK_SECRET,
	onOrderPaid: async (payload: any) => {
		const order = payload.data;
		const polarOrderId = order.id;

		const rawId =
			(order.metadata as Record<string, unknown> | null)?.userId ??
			order.customer?.externalId;

		if (!rawId) {
			console.error('[Polar Webhook] No userId on order:', polarOrderId);
			return;
		}

		const userId = parseInt(String(rawId), 10);
		if (isNaN(userId)) {
			console.error('[Polar Webhook] Invalid userId:', rawId);
			return;
		}

		const productId = order.product?.id;
		const gemsAmount = productId ? PRODUCT_GEMS_MAP[productId] : null;
		if (!gemsAmount) {
			console.error('[Polar Webhook] Unknown product ID:', productId);
			return;
		}

		const usdAmount = productId ? (PRODUCT_USD_MAP[productId] ?? 0) : 0;

		const existingUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: { id: true, gems: true },
		});

		if (!existingUser) {
			console.error('[Polar Webhook] User not found:', userId);
			return;
		}

		await db.transaction(async (tx) => {
			const inserted = await tx
				.insert(gemTransactions)
				.values({ userId, polarOrderId, gemsAmount, usdAmount })
				.onConflictDoNothing({ target: gemTransactions.polarOrderId })
				.returning({ id: gemTransactions.id });

			if (inserted.length === 0) return;

			const isFirstPurchase = existingUser.gems === 0;

			await tx
				.update(user)
				.set({
					gems: sql`${user.gems} + ${gemsAmount}`,
					...(isFirstPurchase ? { founderBadge: true } : {}),
					updatedAt: new Date(),
				})
				.where(eq(user.id, userId));
		});
	},
});
