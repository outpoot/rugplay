import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	newsArticle,
	newsArticleReactionEmoji,
	newsArticleReactionUser,
	user,
	NEWS_REACTION_EMOJI_CREATE_COST,
	NEWS_REACTION_EMOJI_LIMIT
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { isAllowedReactionEmoji } from '$lib/data/emoji-catalog';
import { checkAndAwardAchievements } from '$lib/server/achievements';

/**
 * GET returns every emoji slot currently on the article, each with its
 * live count and whether the requesting user has reacted with it — the
 * initial render for NewsReactionBar.svelte before it switches over to
 * the live websocket feed for subsequent updates.
 */
export async function GET({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user ? Number(session.user.id) : null;

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		return json({ message: 'Invalid article id' }, { status: 400 });
	}

	try {
		const slots = await db
			.select({
				id: newsArticleReactionEmoji.id,
				emoji: newsArticleReactionEmoji.emoji,
				createdAt: newsArticleReactionEmoji.createdAt,
				createdByUserId: user.id,
				createdByUsername: user.username,
				createdByName: user.name,
				createdByNameColor: user.nameColor,
				count: sql<number>`CAST(COUNT(${newsArticleReactionUser.userId}) AS INTEGER)`,
				reactedByMe: userId
					? sql<boolean>`BOOL_OR(${newsArticleReactionUser.userId} = ${userId})`
					: sql<boolean>`FALSE`
			})
			.from(newsArticleReactionEmoji)
			.leftJoin(user, eq(newsArticleReactionEmoji.createdByUserId, user.id))
			.leftJoin(
				newsArticleReactionUser,
				eq(newsArticleReactionUser.reactionEmojiId, newsArticleReactionEmoji.id)
			)
			.where(eq(newsArticleReactionEmoji.articleId, articleId))
			.groupBy(
				newsArticleReactionEmoji.id,
				newsArticleReactionEmoji.emoji,
				newsArticleReactionEmoji.createdAt,
				user.id,
				user.username,
				user.name,
				user.nameColor
			)
			.orderBy(newsArticleReactionEmoji.createdAt);

		return json({
			reactions: slots,
			slotsRemaining: Math.max(0, NEWS_REACTION_EMOJI_LIMIT - slots.length),
			createCost: NEWS_REACTION_EMOJI_CREATE_COST
		});
	} catch (err) {
		console.error('Failed to fetch news reactions:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}

/**
 * POST { emoji } — react with an emoji that already exists on the
 * article (free), or, if it doesn't exist yet, create the slot first
 * (charges NEWS_REACTION_EMOJI_CREATE_COST) and react to it in the same
 * call. Both paths return the fresh slot state and broadcast it live.
 */
export async function POST({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		return json({ message: 'Invalid article id' }, { status: 400 });
	}

	const body = await request.json().catch(() => ({}));
	const emoji = typeof body.emoji === 'string' ? body.emoji : '';

	if (!emoji || !isAllowedReactionEmoji(emoji)) {
		return json({ message: 'Invalid or unsupported emoji' }, { status: 400 });
	}

	const userId = Number(session.user.id);

	try {
		const [articleData] = await db
			.select({ id: newsArticle.id })
			.from(newsArticle)
			.where(eq(newsArticle.id, articleId))
			.limit(1);

		if (!articleData) {
			return json({ message: 'Article not found' }, { status: 404 });
		}

		const result = await db.transaction(async (tx) => {
			// Lock the article's existing slots for the duration of this
			// transaction so two users can't simultaneously create the 6th
			// and 7th emoji slot and both succeed (the unique index on
			// (articleId, emoji) also protects against the same emoji being
			// double-created, but the *count* limit needs this lock too).
			const existingSlots = await tx
				.select({ id: newsArticleReactionEmoji.id, emoji: newsArticleReactionEmoji.emoji })
				.from(newsArticleReactionEmoji)
				.where(eq(newsArticleReactionEmoji.articleId, articleId))
				.for('update');

			let slot = existingSlots.find((s) => s.emoji === emoji);
			let created = false;
			let chargedAmount = 0;

			if (!slot) {
				if (existingSlots.length >= NEWS_REACTION_EMOJI_LIMIT) {
					return { error: 'limit' as const };
				}

				// Charge the creator, row-locked to prevent a double-spend from
				// two rapid create requests racing on the same balance.
				const [payer] = await tx
					.select({ baseCurrencyBalance: user.baseCurrencyBalance })
					.from(user)
					.where(eq(user.id, userId))
					.for('update')
					.limit(1);

				if (!payer) throw new Error('User not found');
				if (parseFloat(payer.baseCurrencyBalance) < NEWS_REACTION_EMOJI_CREATE_COST) {
					return { error: 'insufficient_funds' as const };
				}

				await tx
					.update(user)
					.set({
						baseCurrencyBalance: sql`${user.baseCurrencyBalance} - ${NEWS_REACTION_EMOJI_CREATE_COST}`,
						updatedAt: new Date()
					})
					.where(eq(user.id, userId));

				const [inserted] = await tx
					.insert(newsArticleReactionEmoji)
					.values({ articleId, emoji, createdByUserId: userId })
					.onConflictDoNothing()
					.returning({ id: newsArticleReactionEmoji.id });

				// Conflict means someone else created this exact emoji on this
				// exact article a moment ago (race lost) — refund immediately
				// and fall through to reacting on their slot instead of ours.
				if (!inserted) {
					await tx
						.update(user)
						.set({
							baseCurrencyBalance: sql`${user.baseCurrencyBalance} + ${NEWS_REACTION_EMOJI_CREATE_COST}`,
							updatedAt: new Date()
						})
						.where(eq(user.id, userId));

					const [raced] = await tx
						.select({ id: newsArticleReactionEmoji.id })
						.from(newsArticleReactionEmoji)
						.where(and(eq(newsArticleReactionEmoji.articleId, articleId), eq(newsArticleReactionEmoji.emoji, emoji)))
						.limit(1);
					if (!raced) throw new Error('Failed to resolve reaction slot after conflict');
					slot = raced;
				} else {
					slot = inserted;
					created = true;
					chargedAmount = NEWS_REACTION_EMOJI_CREATE_COST;
				}
			}

			await tx
				.insert(newsArticleReactionUser)
				.values({ userId, reactionEmojiId: slot!.id })
				.onConflictDoNothing();

			const [{ count }] = await tx
				.select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
				.from(newsArticleReactionUser)
				.where(eq(newsArticleReactionUser.reactionEmojiId, slot!.id));

			return { slotId: slot!.id, created, chargedAmount, count };
		});

		if ('error' in result) {
			if (result.error === 'limit') {
				return json(
					{ message: `This article already has the maximum of ${NEWS_REACTION_EMOJI_LIMIT} reactions` },
					{ status: 409 }
				);
			}
			return json(
				{ message: `Not enough balance. Adding a new reaction costs $${NEWS_REACTION_EMOJI_CREATE_COST.toLocaleString()}.` },
				{ status: 402 }
			);
		}

		// Fetch creator info for the response/broadcast so the client can
		// show "created by @username" without a second round trip.
		const [slotInfo] = await db
			.select({
				id: newsArticleReactionEmoji.id,
				emoji: newsArticleReactionEmoji.emoji,
				createdByUserId: user.id,
				createdByUsername: user.username,
				createdByName: user.name,
				createdByNameColor: user.nameColor
			})
			.from(newsArticleReactionEmoji)
			.leftJoin(user, eq(newsArticleReactionEmoji.createdByUserId, user.id))
			.where(eq(newsArticleReactionEmoji.id, result.slotId))
			.limit(1);

		await redis.publish(
			`comments:news:${articleId}`,
			JSON.stringify({
				type: 'reaction_update',
				data: {
					slotId: result.slotId,
					emoji: slotInfo.emoji,
					count: result.count,
					createdByUserId: slotInfo.createdByUserId,
					createdByUsername: slotInfo.createdByUsername,
					createdByName: slotInfo.createdByName,
					createdByNameColor: slotInfo.createdByNameColor,
					created: result.created,
					reactedUserId: userId
				}
			})
		);

		if (result.created) {
			checkAndAwardAchievements(userId, ['social']);
		}

		return json({
			success: true,
			slotId: result.slotId,
			emoji: slotInfo.emoji,
			count: result.count,
			created: result.created,
			chargedAmount: result.chargedAmount,
			createdBy: {
				userId: slotInfo.createdByUserId,
				username: slotInfo.createdByUsername,
				name: slotInfo.createdByName,
				nameColor: slotInfo.createdByNameColor
			}
		});
	} catch (err) {
		console.error('Failed to add news reaction:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}

/**
 * DELETE { emoji } — remove the requesting user's own reaction from an
 * existing emoji slot. Never deletes the slot itself even if the count
 * drops to zero — once created, an emoji stays available on the article
 * (it was paid for), same as a Discord reaction option persisting after
 * everyone un-reacts.
 */
export async function DELETE({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		return json({ message: 'Invalid article id' }, { status: 400 });
	}

	const body = await request.json().catch(() => ({}));
	const emoji = typeof body.emoji === 'string' ? body.emoji : '';
	const userId = Number(session.user.id);

	try {
		const [slot] = await db
			.select({ id: newsArticleReactionEmoji.id })
			.from(newsArticleReactionEmoji)
			.where(and(eq(newsArticleReactionEmoji.articleId, articleId), eq(newsArticleReactionEmoji.emoji, emoji)))
			.limit(1);

		if (!slot) {
			return json({ message: 'Reaction not found' }, { status: 404 });
		}

		await db
			.delete(newsArticleReactionUser)
			.where(and(eq(newsArticleReactionUser.userId, userId), eq(newsArticleReactionUser.reactionEmojiId, slot.id)));

		const [{ count }] = await db
			.select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
			.from(newsArticleReactionUser)
			.where(eq(newsArticleReactionUser.reactionEmojiId, slot.id));

		await redis.publish(
			`comments:news:${articleId}`,
			JSON.stringify({
				type: 'reaction_update',
				data: {
					slotId: slot.id,
					emoji,
					count,
					reactedUserId: userId,
					removed: true
				}
			})
		);

		return json({ success: true, count });
	} catch (err) {
		console.error('Failed to remove news reaction:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
