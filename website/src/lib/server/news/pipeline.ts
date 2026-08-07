/**
 * Entry point for the whole news system: call `publishNewsEvent(...)`
 * from anywhere an interesting thing happens (amm.ts, coin creation,
 * hopium resolution, etc). It:
 *
 *   1. Tries the AI writer (ai-writer.ts)
 *   2. Falls back to the deterministic template (templates.ts) if the AI
 *      is unavailable, times out, or returns something that fails schema
 *      validation
 *   3. Picks a cover image (coin icon > user avatar > themed stock photo)
 *   4. Inserts the article row
 *   5. Publishes it to Redis for the live feed / toast notification
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
import type { NewsEventInput } from './types';

function seedOf(input: string): number {
	let h = 0;
	for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
	return h;
}

export async function publishNewsEvent(event: NewsEventInput): Promise<number | null> {
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
		return null;
	}
}
