import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticle, newsArticleReaction, coin, user } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user ? Number(session.user.id) : null;

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	try {
		const [article] = await db
			.select()
			.from(newsArticle)
			.where(eq(newsArticle.id, articleId))
			.limit(1);

		if (!article || article.isHidden) {
			return json({ message: 'Article not found' }, { status: 404 });
		}

		// Fire-and-forget view increment — don't make the reader wait on it.
		db.update(newsArticle)
			.set({ viewsCount: sql`${newsArticle.viewsCount} + 1` })
			.where(eq(newsArticle.id, articleId))
			.catch((err) => console.error('Failed to increment news view count:', err));

		const [relatedCoin, relatedUser, myReaction] = await Promise.all([
			article.relatedCoinId
				? db
						.select({ id: coin.id, name: coin.name, symbol: coin.symbol, icon: coin.icon })
						.from(coin)
						.where(eq(coin.id, article.relatedCoinId))
						.limit(1)
						.then((r) => r[0] ?? null)
				: Promise.resolve(null),
			article.relatedUserId
				? db
						.select({
							id: user.id,
							username: user.username,
							name: user.name,
							image: user.image,
							nameColor: user.nameColor
						})
						.from(user)
						.where(eq(user.id, article.relatedUserId))
						.limit(1)
						.then((r) => r[0] ?? null)
				: Promise.resolve(null),
			userId
				? db
						.select({ type: newsArticleReaction.type })
						.from(newsArticleReaction)
						.where(
							and(
								eq(newsArticleReaction.userId, userId),
								eq(newsArticleReaction.articleId, articleId)
							)
						)
						.limit(1)
						.then((r) => r[0]?.type ?? null)
				: Promise.resolve(null)
		]);

		return json({
			...article,
			metadata: article.metadata ? JSON.parse(article.metadata) : null,
			relatedCoin,
			relatedUser,
			myReaction
		});
	} catch (err) {
		console.error('Failed to fetch news article:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
