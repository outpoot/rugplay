import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticleComment, newsArticleCommentLike } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';
import { redis } from '$lib/server/redis';

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		return json({ message: 'Not authenticated' }, { status: 401 });
	}

	const commentId = parseInt(params.commentId, 10);
	const articleId = parseInt(params.id, 10);
	const userId = Number(session.user.id);

	if (isNaN(commentId) || isNaN(articleId)) {
		return json({ message: 'Invalid id' }, { status: 400 });
	}

	try {
		const [commentData] = await db
			.select()
			.from(newsArticleComment)
			.where(and(eq(newsArticleComment.id, commentId), eq(newsArticleComment.articleId, articleId)));

		if (!commentData) {
			return json({ message: 'Comment not found' }, { status: 404 });
		}

		const [existingLike] = await db
			.select()
			.from(newsArticleCommentLike)
			.where(and(eq(newsArticleCommentLike.userId, userId), eq(newsArticleCommentLike.commentId, commentId)));

		if (existingLike) {
			return json({ message: 'Comment already liked' }, { status: 400 });
		}

		await db.transaction(async (tx) => {
			await tx.insert(newsArticleCommentLike).values({ userId, commentId });

			await tx
				.update(newsArticleComment)
				.set({ likesCount: sql`${newsArticleComment.likesCount} + 1` })
				.where(eq(newsArticleComment.id, commentId));
		});

		const [updatedComment] = await db
			.select({ likesCount: newsArticleComment.likesCount })
			.from(newsArticleComment)
			.where(eq(newsArticleComment.id, commentId));

		await redis.publish(
			`comments:news:${articleId}`,
			JSON.stringify({
				type: 'comment_liked',
				data: {
					commentId: Number(commentId),
					likesCount: updatedComment.likesCount,
					isLikedByUser: true,
					userId
				}
			})
		);

		return json({ success: true });
	} catch (err) {
		console.error('Failed to like news comment:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const commentId = parseInt(params.commentId, 10);
	const articleId = parseInt(params.id, 10);
	const userId = Number(session.user.id);

	if (isNaN(commentId) || isNaN(articleId)) {
		return json({ message: 'Invalid id' }, { status: 400 });
	}

	try {
		const [commentData] = await db
			.select()
			.from(newsArticleComment)
			.where(and(eq(newsArticleComment.id, commentId), eq(newsArticleComment.articleId, articleId)));

		if (!commentData) {
			return json({ message: 'Comment not found' }, { status: 404 });
		}

		const [existingLike] = await db
			.select()
			.from(newsArticleCommentLike)
			.where(and(eq(newsArticleCommentLike.userId, userId), eq(newsArticleCommentLike.commentId, commentId)));

		if (!existingLike) {
			return json({ message: 'Comment not liked' }, { status: 400 });
		}

		await db.transaction(async (tx) => {
			await tx
				.delete(newsArticleCommentLike)
				.where(and(eq(newsArticleCommentLike.userId, userId), eq(newsArticleCommentLike.commentId, commentId)));

			await tx
				.update(newsArticleComment)
				.set({ likesCount: sql`GREATEST(0, ${newsArticleComment.likesCount} - 1)` })
				.where(eq(newsArticleComment.id, commentId));
		});

		const [updatedComment] = await db
			.select({ likesCount: newsArticleComment.likesCount })
			.from(newsArticleComment)
			.where(eq(newsArticleComment.id, commentId));

		await redis.publish(
			`comments:news:${articleId}`,
			JSON.stringify({
				type: 'comment_liked',
				data: {
					commentId: Number(commentId),
					likesCount: updatedComment.likesCount,
					isLikedByUser: false,
					userId
				}
			})
		);

		return json({ success: true });
	} catch (err) {
		console.error('Failed to unlike news comment:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
