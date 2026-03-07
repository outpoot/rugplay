import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comment, coin, user, commentLike } from '$lib/server/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { isNameAppropriate } from '$lib/server/moderation';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { createNotification } from '$lib/server/notification';
import { getBlockedBySet, getBlockedSet } from '$lib/server/blocks';
import { incrementMissionProgress } from '$lib/server/missions';

export async function GET({ params, request }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	const { coinSymbol } = params;
	const normalizedSymbol = coinSymbol.toUpperCase();

	try {
		const [coinData] = await db
			.select({ id: coin.id })
			.from(coin)
			.where(eq(coin.symbol, normalizedSymbol))
			.limit(1);

		if (!coinData) {
			return json({ message: 'Coin not found' }, { status: 404 });
		}

		const commentsQuery = db
			.select({
				id: comment.id,
				content: comment.content,
				likesCount: comment.likesCount,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				userId: user.id,
				userName: user.name,
				userUsername: user.username,
				userImage: user.image,
				userNameColor: user.nameColor,
				isLikedByUser: session?.user
					? sql<boolean>`EXISTS(SELECT 1 FROM ${commentLike} WHERE ${commentLike.userId} = ${session.user.id} AND ${commentLike.commentId} = ${comment.id})`
					: sql<boolean>`FALSE`
			})
			.from(comment)
			.innerJoin(user, eq(comment.userId, user.id))
			.where(and(eq(comment.coinId, coinData.id), eq(comment.isDeleted, false)))
			.orderBy(desc(comment.createdAt));

		const comments = await commentsQuery;

		if (session?.user) {
			const blockedSet = await getBlockedSet(Number(session.user.id));
			if (blockedSet.size > 0) {
				const filtered = comments.filter((c) => !blockedSet.has(c.userId));
				return json({ comments: filtered });
			}
		}

		return json({ comments });
	} catch (err) {
		console.error('Failed to fetch comments:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}

export async function POST({ request, params }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const { coinSymbol } = params;
	const body = await request.json();
	const content = typeof body === 'object' && body !== null ? String(body.content ?? '') : String(body ?? '');

	if (!content || content.trim().length === 0) {
		throw error(400, 'Comment content is required');
	}

	if (content.length > 500) {
		throw error(400, 'Comment must be 500 characters or less');
	}

	let moderationOk = true;
	try {
		moderationOk = await isNameAppropriate(content.trim());
	} catch (modErr) {
		console.error('Moderation check failed, allowing content:', modErr);
		moderationOk = true;
	}

	if (!moderationOk) {
		throw error(400, 'Comment contains inappropriate content');
	}

	const normalizedSymbol = coinSymbol.toUpperCase();
	const userId = Number(session.user.id);

	try {
		const [coinData] = await db
			.select({ id: coin.id })
			.from(coin)
			.where(eq(coin.symbol, normalizedSymbol))
			.limit(1);

		if (!coinData) {
			throw error(404, 'Coin not found');
		}

		const [newComment] = await db
			.insert(comment)
			.values({
				userId,
				coinId: coinData.id,
				content: content.trim()
			})
			.returning();

		if (!newComment || !newComment.id) {
			throw error(500, 'Failed to create comment');
		}

		const [commentWithUser] = await db
			.select({
				id: comment.id,
				content: comment.content,
				likesCount: comment.likesCount,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				userId: comment.userId,
				userName: user.name,
				userUsername: user.username,
				userImage: user.image,
				userNameColor: user.nameColor,
				isLikedByUser: sql<boolean>`FALSE`
			})
			.from(comment)
			.innerJoin(user, eq(comment.userId, user.id))
			.where(eq(comment.id, newComment.id))
			.limit(1);

		await redis.publish(
			`comments:${normalizedSymbol}`,
			JSON.stringify({
				type: 'new_comment',
				data: commentWithUser
			})
		);

		try {
			await checkAndAwardAchievements(userId, ['social']);
		} catch (achErr) {
			console.error('checkAndAwardAchievements failed:', achErr);
		}

		try {
			await incrementMissionProgress(userId, 'comment_1');
			await incrementMissionProgress(userId, 'comment_3');
		} catch (missErr) {
			console.error('incrementMissionProgress failed:', missErr);
		}

		try {
			const mentionRegex = /@([a-zA-Z0-9_]{3,30})\b/g;
			const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1].toLowerCase());
			const uniqueMentions = [...new Set(mentions)].slice(0, 3);

			if (uniqueMentions.length > 0) {
				const mentionedUsers = await db
					.select({ id: user.id, username: user.username, disableMentions: user.disableMentions })
					.from(user)
					.where(inArray(user.username, uniqueMentions));

				const senderName = commentWithUser.userName || commentWithUser.userUsername;
				const blockedBySet = await getBlockedBySet(userId);

				for (const mentioned of mentionedUsers) {
					if (mentioned.id === userId) continue;
					if (mentioned.disableMentions) continue;
					if (blockedBySet.has(mentioned.id)) continue;

					createNotification(
						mentioned.id.toString(),
						'MENTION',
						`${senderName} mentioned you`,
						`"${content.trim().slice(0, 100)}${content.trim().length > 100 ? '...' : ''}"`,
						`/coin/${normalizedSymbol}`
					);
				}
			}
		} catch (mentionErr) {
			console.error('Failed to process mentions:', mentionErr);
		}

		return json({ comment: commentWithUser });
	} catch (e) {
		console.error('Error creating comment:', e);
		throw error(500, 'Failed to create comment');
	}
}