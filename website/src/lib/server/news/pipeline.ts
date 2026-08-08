/**
 * Entry point for the whole news system: call `publishNewsEvent(...)`
 * from anywhere an interesting thing happens (amm.ts, coin creation,
 * hopium resolution, etc). It:
 *
 *   1. Checks a per-coin, per-event-type cooldown so one coin getting
 *      hammered with trades can't flood the feed (see COOLDOWN below)
 *   2. Tries the AI writer (ai-writer.ts)
 *   3. Falls back to the deterministic template (templates.ts) if the AI
 *      is unavailable, times out, or returns something that fails schema
 *      validation
 *   4. Picks a cover image (coin icon > user avatar > themed stock photo)
 *   5. Inserts the article row
 *   6. Publishes it to Redis for the live feed / toast notification
 *
 * This function deliberately never throws — a failure to publish news
 * should never break the trade/coin-creation/etc that triggered it.
 * Call it fire-and-forget: `publishNewsEvent(...)` without awaiting from
 * hot paths, same pattern already used for rug pull notifications in
 * amm.ts.
 */

import { db } from '$lib/server/db';
import { newsArticle, coin, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { generateAiArticle } from './ai-writer';
import { generateTemplateArticle } from './templates';
import { pickCoverImage } from './cover-images';
import { getPublicUrl } from '$lib/utils';
import type { NewsEventInput, NewsEventType } from './types';

function seedOf(input: string): number {
	let h = 0;
	for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
	return h;
}

// Event types that are driven directly by trade activity on a single coin.
// These are the ones that can fire many times in quick succession (a thin
// pool gets dumped repeatedly, or a coin keeps pumping and dipping), so
// they're the ones that need a per-coin cooldown. Event types NOT in this
// map (COIN_CREATED, HOPIUM_RESOLVED, SEASON_EVENT, PLATFORM, etc) are
// naturally rate-limited by the thing that triggers them (you can only
// create a coin once, a question only resolves once) and don't need one.
const COIN_EVENT_COOLDOWN_SECS: Partial<Record<NewsEventType, number>> = {
	RUG_PULL: 24 * 60 * 60,
	COIN_PUMP: 24 * 60 * 60,
	WHALE_TRADE: 24 * 60 * 60,
	COIN_MILESTONE: 24 * 60 * 60
};

/**
 * Atomically claims the "this coin can post this type of article today"
 * slot. Returns true if the event should proceed, false if the same coin
 * already published this event type within the cooldown window.
 *
 * Uses SET NX EX so concurrent trades hitting the same thin pool at the
 * same moment can only ever have one of them win the slot, instead of a
 * check-then-insert race where both requests see "no cooldown yet" and
 * both publish.
 */
async function claimCoinEventSlot(type: NewsEventType, coinId: number): Promise<boolean> {
	const cooldownSecs = COIN_EVENT_COOLDOWN_SECS[type];
	if (!cooldownSecs) return true; // no cooldown configured for this type

	const key = `news:cooldown:${type}:${coinId}`;
	try {
		const claimed = await redis.set(key, '1', { NX: true, EX: cooldownSecs });
		return claimed === 'OK';
	} catch (err) {
		// If Redis is down, fail open rather than silently blackholing news
		// entirely — worst case we're back to the old (spammy) behavior for
		// as long as Redis is unavailable, which is preferable to no news
		// at all.
		console.error('Failed to check news cooldown, allowing event through:', err);
		return true;
	}
}

export async function publishNewsEvent(event: NewsEventInput): Promise<number | null> {
	// 0. Per-coin cooldown for trade-driven event types. One coin can only
	// post one RUG_PULL, one COIN_PUMP, one WHALE_TRADE, and one
	// COIN_MILESTONE article per day — otherwise a thin-liquidity coin
	// getting repeatedly dumped/pumped floods the feed with near identical
	// "dramatic" articles about the same $1 trade. Claimed outside the
	// main try/catch below: if anything after this point throws, we
	// release the slot in the catch so a transient failure (AI timeout,
	// db hiccup) doesn't burn the coin's only slot for the whole day
	// without an article ever actually getting published.
	let cooldownKey: string | null = null;
	if (event.relatedCoinId != null && COIN_EVENT_COOLDOWN_SECS[event.type]) {
		cooldownKey = `news:cooldown:${event.type}:${event.relatedCoinId}`;
		const allowed = await claimCoinEventSlot(event.type, event.relatedCoinId);
		if (!allowed) {
			return null;
		}
	}

	try {
		// 1. AI first, template fallback. Both paths are wrapped so a bug in
		// either never prevents an article from being published.
		let article: { headline: string; summary: string; body: string };
		let source: 'AI' | 'TEMPLATE';

		const aiResult = await generateAiArticle(event).catch(() => null);
		if (aiResult) {
			article = aiResult;
			source = 'AI';
		} else {
			article = generateTemplateArticle(event);
			source = 'TEMPLATE';
		}

		// 2. Cover image resolution: prefer something tied to the event
		// (coin icon, user avatar), fall back to a themed stock photo.
		let coverImage = event.coverImage ?? null;
		let coverImageAttribution = event.coverImageAttribution ?? null;

		if (!coverImage && event.relatedCoinId) {
			const [c] = await db
				.select({ icon: coin.icon })
				.from(coin)
				.where(eq(coin.id, event.relatedCoinId))
				.limit(1);
			if (c?.icon) {
				coverImage = c.icon; // resolved through getPublicUrl at render time
			}
		}

		if (!coverImage && event.relatedUserId) {
			const [u] = await db
				.select({ image: user.image })
				.from(user)
				.where(eq(user.id, event.relatedUserId))
				.limit(1);
			if (u?.image) {
				coverImage = u.image;
			}
		}

		if (!coverImage) {
			const stock = pickCoverImage(event.type, seedOf(article.headline));
			coverImage = stock.url;
			coverImageAttribution = stock.attribution;
		}

		// 3. Insert. Give AI-authored rug pull / whale articles a small
		// trending head start so genuinely big events surface immediately
		// rather than waiting for likes to accumulate.
		const initialScore = event.type === 'RUG_PULL' || event.type === 'WHALE_TRADE' ? 5 : 1;

		const [inserted] = await db
			.insert(newsArticle)
			.values({
				type: event.type,
				source,
				headline: article.headline,
				summary: article.summary,
				body: article.body,
				coverImage,
				coverImageAttribution,
				relatedCoinId: event.relatedCoinId ?? null,
				relatedUserId: event.relatedUserId ?? null,
				relatedQuestionId: event.relatedQuestionId ?? null,
				metadata: JSON.stringify(event.metadata),
				trendingScore: initialScore.toString()
			})
			.returning({ id: newsArticle.id });

		// 4. Publish for the live feed (WebSocket bridge / in-app toast).
		try {
			await redis.publish(
				'news:published',
				JSON.stringify({
					id: inserted.id,
					type: event.type,
					headline: article.headline,
					summary: article.summary,
					coverImage: getPublicUrl(coverImage) ?? coverImage,
					createdAt: new Date().toISOString()
				})
			);
		} catch (redisError) {
			console.error('Failed to publish news article to Redis:', redisError);
		}

		return inserted.id;
	} catch (error) {
		console.error('Failed to publish news event (article was not created):', error);
		// Release the cooldown slot since no article actually got published —
		// a genuine future event for this coin shouldn't be silently eaten
		// by a slot that was claimed but never used.
		if (cooldownKey) {
			await redis.del(cooldownKey).catch(() => {});
		}
		return null;
	}
}
