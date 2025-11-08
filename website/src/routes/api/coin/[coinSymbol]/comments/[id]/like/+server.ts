import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comment, commentLike, coin } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';
import { redis } from '$lib/server/redis';

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		return json({ message: 'Not authenticated' }, { status: 401 });
	}

	const commentId = parseInt(params.id);
	const { coinSymbol } = params;
	const userId = Number(session.user.id);

	if (isNaN(commentId)) {
		return json({ message: 'Invalid comment ID' }, { status: 400 });
	}

	try {
		// Verify the comment exists and belongs to the specified coin
		const [commentData] = await db
			.select()
			.from(comment)
			.innerJoin(coin, eq(comment.coinId, coin.id))
			.where(and(eq(comment.id, commentId), eq(coin.symbol, coinSymbol)));

		if (!commentData) {
			return json({ message: 'Comment not found' }, { status: 404 });
		}

		// Check if user already liked this comment
		const [existingLike] = await db
			.select()
			.from(commentLike)
			.where(and(eq(commentLike.userId, userId), eq(commentLike.commentId, commentId)));

		if (existingLike) {
			return json({ message: 'Comment already liked' }, { status: 400 });
		}

		// Add like and increment count
		await db.transaction(async (tx) => {
			await tx.insert(commentLike).values({ userId, commentId });

			await tx
				.update(comment)
				.set({ likesCount: sql`${comment.likesCount} + 1` })
				.where(eq(comment.id, commentId));
		});

		const [updatedComment] = await db
			.select({ likesCount: comment.likesCount })
			.from(comment)
			.where(eq(comment.id, commentId));

		await redis.publish(
			`comments:${coinSymbol!.toUpperCase()}`,
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
	} catch (error) {
		console.error('Failed to like comment:', error);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const commentId = parseInt(params.id);
	const { coinSymbol } = params;
	const userId = Number(session.user.id);

	if (isNaN(commentId)) {
		return json({ message: 'Invalid comment ID' }, { status: 400 });
	}

	try {
		// Verify the comment exists and belongs to the specified coin
		const [commentData] = await db
			.select()
			.from(comment)
			.innerJoin(coin, eq(comment.coinId, coin.id))
			.where(and(eq(comment.id, commentId), eq(coin.symbol, coinSymbol)));

		if (!commentData) {
			return json({ message: 'Comment not found' }, { status: 404 });
		}

		// Check if user has liked this comment
		const [existingLike] = await db
			.select()
			.from(commentLike)
			.where(and(eq(commentLike.userId, userId), eq(commentLike.commentId, commentId)));

		if (!existingLike) {
			return json({ message: 'Comment not liked' }, { status: 400 });
		}

		// Remove like and decrement count
		await db.transaction(async (tx) => {
			await tx
				.delete(commentLike)
				.where(and(eq(commentLike.userId, userId), eq(commentLike.commentId, commentId)));

			await tx
				.update(comment)
				.set({ likesCount: sql`GREATEST(0, ${comment.likesCount} - 1)` })
				.where(eq(comment.id, commentId));
		});

		const [updatedComment] = await db
			.select({ likesCount: comment.likesCount })
			.from(comment)
			.where(eq(comment.id, commentId));

		await redis.publish(
			`comments:${coinSymbol.toUpperCase()}`,
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
	} catch (error) {
		console.error('Failed to unlike comment:', error);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
