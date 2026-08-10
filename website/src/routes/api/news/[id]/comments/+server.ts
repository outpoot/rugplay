import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticleComment, newsArticleCommentLike, newsArticle, user } from '$lib/server/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { isNameAppropriate } from '$lib/server/moderation';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { createNotification } from '$lib/server/notification';
import { getBlockedBySet, getBlockedSet } from '$lib/server/blocks';

const MAX_COMMENT_LENGTH = 500;

export async function GET({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		return json({ message: 'Invalid article id' }, { status: 400 });
	}

	try {
		const [articleData] = await db
			.select({ id: newsArticle.id })
			.from(newsArticle)
			.where(eq(newsArticle.id, articleId))
			.limit(1);

		if (!articleData) {
			return json({ message: 'Article not found' }, { status: 404 });
		}

		const commentsQuery = db
			.select({
				id: newsArticleComment.id,
				content: newsArticleComment.content,
				likesCount: newsArticleComment.likesCount,
				createdAt: newsArticleComment.createdAt,
				updatedAt: newsArticleComment.updatedAt,
				userId: user.id,
				userName: user.name,
				userUsername: user.username,
				userImage: user.image,
				userNameColor: user.nameColor,
				isLikedByUser: session?.user
					? sql<boolean>`EXISTS(SELECT 1 FROM ${newsArticleCommentLike} WHERE ${newsArticleCommentLike.userId} = ${session.user.id} AND ${newsArticleCommentLike.commentId} = ${newsArticleComment.id})`
					: sql<boolean>`FALSE`
			})
			.from(newsArticleComment)
			.innerJoin(user, eq(newsArticleComment.userId, user.id))
			.where(and(eq(newsArticleComment.articleId, articleId), eq(newsArticleComment.isDeleted, false)))
			.orderBy(desc(newsArticleComment.createdAt));

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
		console.error('Failed to fetch news comments:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}

export async function POST({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	const { content } = await request.json();

	if (!content || content.trim().length === 0) {
		throw error(400, 'Comment content is required');
	}

	if (content.length > MAX_COMMENT_LENGTH) {
		throw error(400, `Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
	}

	if (!(await isNameAppropriate(content.trim()))) {
		throw error(400, 'Comment contains inappropriate content');
	}

	const userId = Number(session.user.id);

	try {
		const [articleData] = await db
			.select({ id: newsArticle.id })
			.from(newsArticle)
			.where(eq(newsArticle.id, articleId))
			.limit(1);

		if (!articleData) {
			throw error(404, 'Article not found');
		}

		const [newComment] = await db
			.insert(newsArticleComment)
			.values({
				userId,
				articleId,
				content: content.trim()
			})
			.returning();

		const [commentWithUser] = await db
			.select({
				id: newsArticleComment.id,
				content: newsArticleComment.content,
				likesCount: newsArticleComment.likesCount,
				createdAt: newsArticleComment.createdAt,
				updatedAt: newsArticleComment.updatedAt,
				userId: newsArticleComment.userId,
				userName: user.name,
				userUsername: user.username,
				userImage: user.image,
				userNameColor: user.nameColor,
				isLikedByUser: sql<boolean>`FALSE`
			})
			.from(newsArticleComment)
			.innerJoin(user, eq(newsArticleComment.userId, user.id))
			.where(eq(newsArticleComment.id, newComment.id))
			.limit(1);

		// Same room-naming convention as the emoji reaction bar and the
		// websocket bridge's generic `comments:*` psubscribe — no bridge
		// changes needed, clients just join room `news:{id}` via set_coin.
		await redis.publish(
			`comments:news:${articleId}`,
			JSON.stringify({
				type: 'new_comment',
				data: commentWithUser
			})
		);

		checkAndAwardAchievements(userId, ['social']);

		// Detect @mentions and send notifications — identical convention to
		// coin comments (routes/api/coin/[coinSymbol]/comments/+server.ts).
		try {
			const mentionRegex = /@([a-zA-Z0-9_]{3,30})\b/g;
			const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1].toLowerCase());
			const uniqueMentions = [...new Set(mentions)].slice(0, 3); // Limit to 3 mentions per message

			if (uniqueMentions.length > 0) {
				const mentionedUsers = await db
					.select({ id: user.id, username: user.username, disableMentions: user.disableMentions })
					.from(user)
					.where(inArray(user.username, uniqueMentions));

				const senderName = commentWithUser.userName || commentWithUser.userUsername;
				const [blockedBySet, senderBlockedSet] = await Promise.all([
					getBlockedBySet(userId),
					getBlockedSet(userId)
				]);

				for (const mentioned of mentionedUsers) {
					if (mentioned.id === userId) continue; // Don't notify yourself
					if (mentioned.disableMentions) continue;
					if (blockedBySet.has(mentioned.id)) continue; // Don't notify users who blocked you
					if (senderBlockedSet.has(mentioned.id)) continue; // Don't notify users you've blocked

					createNotification(
						mentioned.id.toString(),
						'MENTION',
						`${senderName} mentioned you`,
						`"${content.trim().slice(0, 100)}${content.trim().length > 100 ? '...' : ''}"`,
						`/news/${articleId}`
					);
				}
			}
		} catch (mentionErr) {
			console.error('Failed to process news comment mentions:', mentionErr);
		}

		return json({ comment: commentWithUser });
	} catch (e) {
		console.error('Error creating news comment:', e);
		throw error(500, 'Failed to create comment');
	}
}
