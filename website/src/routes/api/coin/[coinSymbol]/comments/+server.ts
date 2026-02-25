import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comment, coin, user, commentLike } from '$lib/server/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { isNameAppropriate } from '$lib/server/moderation';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { createNotification } from '$lib/server/notification';

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
                isLikedByUser: session?.user ?
                    sql<boolean>`EXISTS(SELECT 1 FROM ${commentLike} WHERE ${commentLike.userId} = ${session.user.id} AND ${commentLike.commentId} = ${comment.id})` :
                    sql<boolean>`FALSE`
            })
            .from(comment)
            .innerJoin(user, eq(comment.userId, user.id))
            .where(and(eq(comment.coinId, coinData.id), eq(comment.isDeleted, false)))
            .orderBy(desc(comment.createdAt));

        const comments = await commentsQuery;

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
    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
        throw error(400, 'Comment content is required');
    }

    if (content.length > 500) {
        throw error(400, 'Comment must be 500 characters or less');
    }

    if (!(await isNameAppropriate(content.trim()))) {
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

        checkAndAwardAchievements(userId, ['social']);

        // Detect @mentions and send notifications
        try {
            const mentionRegex = /@([a-zA-Z0-9_]{3,30})\b/g;
            const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
            const uniqueMentions = [...new Set(mentions)];

            if (uniqueMentions.length > 0) {
                const mentionedUsers = await db
                    .select({ id: user.id, username: user.username, disableMentions: user.disableMentions })
                    .from(user)
                    .where(inArray(user.username, uniqueMentions));

                const senderName = commentWithUser.userName || commentWithUser.userUsername;

                for (const mentioned of mentionedUsers) {
                    if (mentioned.id === userId) continue; // Don't notify yourself
                    if (mentioned.disableMentions) continue;

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
