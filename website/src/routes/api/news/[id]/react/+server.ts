import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticle, newsArticleReaction } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const VALID_TYPES = ['LIKE', 'DISLIKE'] as const;
type ReactionType = (typeof VALID_TYPES)[number];

export async function POST({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}
	const userId = Number(session.user.id);
	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	const body = await request.json().catch(() => ({}));
	const { type } = body as { type?: string };

	if (!type || !VALID_TYPES.includes(type as ReactionType)) {
		throw error(400, 'type must be LIKE or DISLIKE');
	}

	try {
		const result = await db.transaction(async (tx) => {
			const [existing] = await tx
				.select({ type: newsArticleReaction.type })
				.from(newsArticleReaction)
				.where(
					and(eq(newsArticleReaction.userId, userId), eq(newsArticleReaction.articleId, articleId))
				)
				.limit(1);

			// Toggle off if clicking the same reaction again.
			if (existing && existing.type === type) {
				await tx
					.delete(newsArticleReaction)
					.where(
						and(
							eq(newsArticleReaction.userId, userId),
							eq(newsArticleReaction.articleId, articleId)
						)
					);

				await tx
					.update(newsArticle)
					.set({
						likesCount:
							type === 'LIKE'
								? sql`GREATEST(${newsArticle.likesCount} - 1, 0)`
								: newsArticle.likesCount,
						dislikesCount:
							type === 'DISLIKE'
								? sql`GREATEST(${newsArticle.dislikesCount} - 1, 0)`
								: newsArticle.dislikesCount,
						trendingScore: sql`${newsArticle.trendingScore} + ${type === 'LIKE' ? -1 : 1} * 0.5`
					})
					.where(eq(newsArticle.id, articleId));

				return { myReaction: null };
			}

			// Switching from one reaction to the other, or reacting fresh.
			if (existing) {
				await tx
					.update(newsArticleReaction)
					.set({ type: type as ReactionType })
					.where(
						and(
							eq(newsArticleReaction.userId, userId),
							eq(newsArticleReaction.articleId, articleId)
						)
					);

				await tx
					.update(newsArticle)
					.set({
						likesCount:
							type === 'LIKE'
								? sql`${newsArticle.likesCount} + 1`
								: sql`GREATEST(${newsArticle.likesCount} - 1, 0)`,
						dislikesCount:
							type === 'DISLIKE'
								? sql`${newsArticle.dislikesCount} + 1`
								: sql`GREATEST(${newsArticle.dislikesCount} - 1, 0)`
					})
					.where(eq(newsArticle.id, articleId));
			} else {
				await tx.insert(newsArticleReaction).values({
					userId,
					articleId,
					type: type as ReactionType
				});

				await tx
					.update(newsArticle)
					.set({
						likesCount:
							type === 'LIKE' ? sql`${newsArticle.likesCount} + 1` : newsArticle.likesCount,
						dislikesCount:
							type === 'DISLIKE'
								? sql`${newsArticle.dislikesCount} + 1`
								: newsArticle.dislikesCount,
						trendingScore: sql`${newsArticle.trendingScore} + ${type === 'LIKE' ? 1 : -0.5}`
					})
					.where(eq(newsArticle.id, articleId));
			}

			return { myReaction: type };
		});

		const [updated] = await db
			.select({ likesCount: newsArticle.likesCount, dislikesCount: newsArticle.dislikesCount })
			.from(newsArticle)
			.where(eq(newsArticle.id, articleId))
			.limit(1);

		return json({ ...result, likesCount: updated?.likesCount, dislikesCount: updated?.dislikesCount });
	} catch (err) {
		console.error('Failed to react to news article:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
