import { auth } from '$lib/auth';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticle, newsArticleReaction, coin, user } from '$lib/server/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getNewsFeed, type FeedSort } from '$lib/server/news/ranking';

const VALID_SORTS: FeedSort[] = ['foryou', 'latest', 'trending'];

export async function GET({ url, request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user ? Number(session.user.id) : null;

	const sortParam = url.searchParams.get('sort') || 'foryou';
	const sort: FeedSort = VALID_SORTS.includes(sortParam as FeedSort)
		? (sortParam as FeedSort)
		: 'foryou';
	// "For You" without a logged-in user degrades to latest — there's
	// nothing to personalize against.
	const effectiveSort: FeedSort = sort === 'foryou' && !userId ? 'latest' : sort;

	const cursorParam = url.searchParams.get('cursor');
	const cursor = cursorParam ? parseInt(cursorParam, 10) : null;

	try {
		const { articles, nextCursor } = await getNewsFeed({ userId, sort: effectiveSort, cursor });

		if (articles.length === 0) {
			return json({ articles: [], nextCursor: null });
		}

		const coinIds = [...new Set(articles.map((a) => a.relatedCoinId).filter(Boolean))] as number[];
		const relatedUserIds = [
			...new Set(articles.map((a) => a.relatedUserId).filter(Boolean))
		] as number[];

		const [coins, users, myReactions] = await Promise.all([
			coinIds.length
				? db
						.select({ id: coin.id, name: coin.name, symbol: coin.symbol, icon: coin.icon })
						.from(coin)
						.where(inArray(coin.id, coinIds))
				: Promise.resolve([]),
			relatedUserIds.length
				? db
						.select({
							id: user.id,
							username: user.username,
							name: user.name,
							image: user.image,
							nameColor: user.nameColor
						})
						.from(user)
						.where(inArray(user.id, relatedUserIds))
				: Promise.resolve([]),
			userId
				? db
						.select({ articleId: newsArticleReaction.articleId, type: newsArticleReaction.type })
						.from(newsArticleReaction)
						.where(
							and(
								eq(newsArticleReaction.userId, userId),
								inArray(
									newsArticleReaction.articleId,
									articles.map((a) => a.id)
								)
							)
						)
				: Promise.resolve([])
		]);

		const coinMap = new Map(coins.map((c) => [c.id, c]));
		const userMap = new Map(users.map((u) => [u.id, u]));
		const reactionMap = new Map(myReactions.map((r) => [r.articleId, r.type]));

		const enriched = articles.map((a) => ({
			...a,
			metadata: a.metadata ? JSON.parse(a.metadata) : null,
			relatedCoin: a.relatedCoinId ? coinMap.get(a.relatedCoinId) ?? null : null,
			relatedUser: a.relatedUserId ? userMap.get(a.relatedUserId) ?? null : null,
			myReaction: reactionMap.get(a.id) ?? null
		}));

		return json({ articles: enriched, nextCursor, sort: effectiveSort });
	} catch (err) {
		console.error('Failed to fetch news feed:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
