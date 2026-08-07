/**
 * "Smart" feed ranking, in the spirit of a big news app's personalized
 * front page: a blend of recency, engagement, and relevance to what the
 * requesting user actually holds/created/bets on — without needing a
 * follow graph (the platform doesn't have one yet; see the coin-boost
 * ideas thread for a suggested follow-system addition).
 *
 * The score is computed per-request in SQL (cheap: a handful of indexed
 * columns and a LEFT JOIN against the user's portfolio) rather than
 * precomputed per-user, since Rugplay's user base doesn't need a fan-out
 * write pattern yet. If this gets expensive at scale, this is the file
 * to swap for a precomputed feed table.
 */

import { db } from '$lib/server/db';
import { newsArticle, coin, userPortfolio } from '$lib/server/db/schema';
import { and, desc, eq, sql, inArray } from 'drizzle-orm';

export type FeedSort = 'foryou' | 'latest' | 'trending';

interface FeedPage {
	articles: any[];
	nextCursor: number | null;
}

const PAGE_SIZE = 20;

/**
 * Half-life style recency decay: an article's contribution to score
 * halves roughly every 6 hours. Keeps the feed fresh without a hard
 * cutoff.
 */
const RECENCY_HALF_LIFE_HOURS = 6;

export async function getNewsFeed(opts: {
	userId: number | null;
	sort: FeedSort;
	cursor?: number | null;
}): Promise<FeedPage> {
	const { userId, sort, cursor } = opts;

	// Coins the requesting user holds or created — used to boost relevance
	// for "For You", same idea as a personalized homepage ranking articles
	// about tickers in your portfolio higher.
	let relevantCoinIds: number[] = [];
	if (userId && sort === 'foryou') {
		const [held, created] = await Promise.all([
			db
				.select({ coinId: userPortfolio.coinId })
				.from(userPortfolio)
				.where(and(eq(userPortfolio.userId, userId), sql`${userPortfolio.quantity} > 0`)),
			db.select({ id: coin.id }).from(coin).where(eq(coin.creatorId, userId))
		]);
		relevantCoinIds = [...held.map((h) => h.coinId), ...created.map((c) => c.id)];
	}

	const recencyScoreExpr = sql<number>`
		POWER(0.5, EXTRACT(EPOCH FROM (NOW() - ${newsArticle.createdAt})) / (${RECENCY_HALF_LIFE_HOURS} * 3600.0))
	`;

	const engagementScoreExpr = sql<number>`
		LN(1 + ${newsArticle.likesCount} - ${newsArticle.dislikesCount} + (${newsArticle.viewsCount} * 0.05) + (${newsArticle.sharesCount} * 2))
	`;

	const relevanceBoostExpr =
		relevantCoinIds.length > 0
			? sql<number>`CASE WHEN ${newsArticle.relatedCoinId} IN (${sql.join(
					relevantCoinIds.map((id) => sql`${id}`),
					sql`, `
				)}) THEN 3.0 ELSE 1.0 END`
			: sql<number>`1.0`;

	const pinnedBoostExpr = sql<number>`CASE WHEN ${newsArticle.isPinned} THEN 10.0 ELSE 0.0 END`;

	const baseWhere = cursor
		? and(eq(newsArticle.isHidden, false), sql`${newsArticle.id} < ${cursor}`)
		: eq(newsArticle.isHidden, false);

	let orderByClause;
	if (sort === 'latest') {
		orderByClause = desc(newsArticle.createdAt);
	} else if (sort === 'trending') {
		orderByClause = desc(engagementScoreExpr);
	} else {
		// Composite "For You" score, inlined directly into ORDER BY: recency
		// decays smoothly, engagement adds a log-scaled bump (so one viral
		// article doesn't permanently dominate), relevance triples anything
		// touching the user's own coins, pinned articles float to the top
		// regardless. Inlined rather than referenced via a SELECT alias,
		// since the expression isn't part of the selected column list.
		orderByClause = desc(sql`(${pinnedBoostExpr}) + ((${recencyScoreExpr}) * 5.0 + (${engagementScoreExpr})) * (${relevanceBoostExpr})`);
	}

	const rows = await db
		.select({
			id: newsArticle.id,
			type: newsArticle.type,
			source: newsArticle.source,
			headline: newsArticle.headline,
			summary: newsArticle.summary,
			body: newsArticle.body,
			coverImage: newsArticle.coverImage,
			coverImageAttribution: newsArticle.coverImageAttribution,
			relatedCoinId: newsArticle.relatedCoinId,
			relatedUserId: newsArticle.relatedUserId,
			relatedQuestionId: newsArticle.relatedQuestionId,
			metadata: newsArticle.metadata,
			likesCount: newsArticle.likesCount,
			dislikesCount: newsArticle.dislikesCount,
			sharesCount: newsArticle.sharesCount,
			viewsCount: newsArticle.viewsCount,
			isPinned: newsArticle.isPinned,
			createdAt: newsArticle.createdAt
		})
		.from(newsArticle)
		.where(baseWhere)
		.orderBy(orderByClause, desc(newsArticle.id))
		.limit(PAGE_SIZE + 1);

	const hasMore = rows.length > PAGE_SIZE;
	const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

	return {
		articles: pageRows,
		nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null
	};
}
