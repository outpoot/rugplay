/**
 * "Smart" feed ranking, in the spirit of a big news app's personalized
 * front page — except this one actually knows what YOU specifically
 * read, liked, shared, reported, and lingered on, not just what's
 * globally popular. Two layers feed into the "For You" score:
 *
 *   1. Global signal: recency + aggregate engagement (likes, dislikes,
 *      views, shares) on the article itself.
 *   2. Personal signal: a per-user "affinity profile" built from that
 *      user's own view/dwell-time, reaction, share, and report history,
 *      broken down by article type and by coin. An article about a
 *      coin/type you've dwelled on and liked before ranks higher for
 *      you specifically; a type you've reported or reliably skip past
 *      ranks lower for you specifically, even while it's fine for
 *      everyone else's feed.
 *
 * Both layers are computed per-request in SQL (a handful of indexed
 * columns, a couple of small aggregate subqueries scoped to the
 * requesting user) rather than precomputed, since Rugplay's user base
 * doesn't need a fan-out write pattern yet. If this gets expensive at
 * scale, this is the file to swap for a precomputed feed/affinity table
 * refreshed on a schedule instead of read-time.
 */

import { db } from '$lib/server/db';
import {
	newsArticle,
	newsArticleView,
	newsArticleReaction,
	newsArticleReport,
	newsArticleShare,
	coin,
	userPortfolio
} from '$lib/server/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

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

/**
 * How far back a user's own activity counts toward their affinity
 * profile. Recent taste matters more than something you liked eight
 * months ago — a 30 day window keeps the profile responsive to shifting
 * interest without needing decay math on top of the window itself.
 */
const AFFINITY_WINDOW_DAYS = 30;

/**
 * Dwell time above which a view counts as "actually read it" rather than
 * "scrolled past it" for affinity purposes. A few seconds is enough to
 * register a headline; genuine engagement with a card or article takes
 * noticeably longer, so this floor keeps a fast scroll from counting the
 * same as a real read.
 */
const MEANINGFUL_DWELL_MS = 4000;

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

	// --- Personal affinity, "for you" only -------------------------------
	// Two small per-user aggregates, correlated into the main query as
	// scalar subqueries: one keyed by article TYPE (do you tend to engage
	// with RUG_PULL articles, or skip them?), one keyed by COIN (have you
	// specifically engaged with articles about this coin before, beyond
	// just holding it?). Both are scoped to AFFINITY_WINDOW_DAYS and to
	// the requesting user only, so the query stays cheap and never looks
	// at anyone else's activity.
	//
	// Positive signal: meaningful dwell time, likes, shares (weighted
	// highest — most deliberate action). Negative signal: dislikes and
	// reports (weighted heaviest — reporting something is an explicit
	// "don't show me this"). Everything nets into one score per bucket
	// so a type/coin you mostly like nets positive even with the odd
	// dislike, and vice versa.
	let typeAffinityExpr = sql<number>`0`;
	let coinAffinityExpr = sql<number>`0`;

	if (userId && sort === 'foryou') {
		typeAffinityExpr = sql<number>`
			COALESCE((
				SELECT
					SUM(
						CASE WHEN v.dwell_ms >= ${MEANINGFUL_DWELL_MS} THEN 1.0 ELSE 0.0 END
						+ CASE WHEN r.type = 'LIKE' THEN 2.0 WHEN r.type = 'DISLIKE' THEN -3.0 ELSE 0.0 END
						+ CASE WHEN s.id IS NOT NULL THEN 3.0 ELSE 0.0 END
						+ CASE WHEN rep.id IS NOT NULL THEN -4.0 ELSE 0.0 END
					)
				FROM ${newsArticle} a2
				LEFT JOIN ${newsArticleView} v ON v.article_id = a2.id AND v.user_id = ${userId}
				LEFT JOIN ${newsArticleReaction} r ON r.article_id = a2.id AND r.user_id = ${userId}
				LEFT JOIN ${newsArticleShare} s ON s.article_id = a2.id AND s.user_id = ${userId}
				LEFT JOIN ${newsArticleReport} rep ON rep.article_id = a2.id AND rep.user_id = ${userId}
				WHERE a2.type = ${newsArticle.type}
					AND a2.created_at >= NOW() - ${sql.raw(`INTERVAL '${AFFINITY_WINDOW_DAYS} days'`)}
					AND (v.user_id IS NOT NULL OR r.user_id IS NOT NULL OR s.user_id IS NOT NULL OR rep.user_id IS NOT NULL)
			), 0)
		`;

		coinAffinityExpr = sql<number>`
			CASE WHEN ${newsArticle.relatedCoinId} IS NULL THEN 0 ELSE COALESCE((
				SELECT
					SUM(
						CASE WHEN v.dwell_ms >= ${MEANINGFUL_DWELL_MS} THEN 1.0 ELSE 0.0 END
						+ CASE WHEN r.type = 'LIKE' THEN 2.0 WHEN r.type = 'DISLIKE' THEN -3.0 ELSE 0.0 END
						+ CASE WHEN s.id IS NOT NULL THEN 3.0 ELSE 0.0 END
						+ CASE WHEN rep.id IS NOT NULL THEN -4.0 ELSE 0.0 END
					)
				FROM ${newsArticle} a3
				LEFT JOIN ${newsArticleView} v ON v.article_id = a3.id AND v.user_id = ${userId}
				LEFT JOIN ${newsArticleReaction} r ON r.article_id = a3.id AND r.user_id = ${userId}
				LEFT JOIN ${newsArticleShare} s ON s.article_id = a3.id AND s.user_id = ${userId}
				LEFT JOIN ${newsArticleReport} rep ON rep.article_id = a3.id AND rep.user_id = ${userId}
				WHERE a3.related_coin_id = ${newsArticle.relatedCoinId}
					AND a3.created_at >= NOW() - ${sql.raw(`INTERVAL '${AFFINITY_WINDOW_DAYS} days'`)}
					AND (v.user_id IS NOT NULL OR r.user_id IS NOT NULL OR s.user_id IS NOT NULL OR rep.user_id IS NOT NULL)
			), 0) END
		`;
	}

	// Squash the raw affinity sum through tanh so a handful of strong
	// signals moves the needle a lot, but no amount of history lets
	// personal affinity completely drown out recency/engagement for
	// everyone else's articles — a multiplicative range of roughly
	// 0.4x (heavily disliked/reported topic) to 1.8x (topic you clearly
	// love), centered on 1.0x (no history yet, i.e. new users see the
	// same feed as "latest").
	const personalMultiplierExpr = sql<number>`
		(1.0 + 0.4 * TANH((${typeAffinityExpr} + 1.5 * ${coinAffinityExpr}) / 6.0))
	`;

	// A user reporting an article is an explicit "don't show me this" —
	// that article shouldn't keep reappearing in their own feed while the
	// report is pending review, even though it's still visible to
	// everyone else (global auto-hide only kicks in at AUTO_HIDE_THRESHOLD
	// distinct reports, see routes/api/news/[id]/report). This filter only
	// ever narrows what one specific user sees, never the underlying data.
	const notSelfReportedExpr = userId
		? sql`NOT EXISTS (
				SELECT 1 FROM ${newsArticleReport} sr
				WHERE sr.article_id = ${newsArticle.id} AND sr.user_id = ${userId}
			)`
		: sql`TRUE`;

	const baseWhere = cursor
		? and(eq(newsArticle.isHidden, false), notSelfReportedExpr, sql`${newsArticle.id} < ${cursor}`)
		: and(eq(newsArticle.isHidden, false), notSelfReportedExpr);

	let orderByClause;
	if (sort === 'latest') {
		orderByClause = desc(newsArticle.createdAt);
	} else if (sort === 'trending') {
		orderByClause = desc(engagementScoreExpr);
	} else {
		// Composite "For You" score, inlined directly into ORDER BY: recency
		// decays smoothly, engagement adds a log-scaled bump (so one viral
		// article doesn't permanently dominate), relevance triples anything
		// touching the user's own coins, personal affinity then scales the
		// whole thing up or down based on what THIS user specifically tends
		// to read/like/share vs skip/dislike/report, and pinned articles
		// float to the top regardless. Inlined rather than referenced via a
		// SELECT alias, since the expression isn't part of the selected
		// column list.
		orderByClause = desc(sql`
			(${pinnedBoostExpr})
			+ ((${recencyScoreExpr}) * 5.0 + (${engagementScoreExpr})) * (${relevanceBoostExpr}) * (${personalMultiplierExpr})
		`);
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
