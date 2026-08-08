import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticleView } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// Reported dwell time is clamped to this per-beacon so a stuck/backgrounded
// tab sitting open for hours can't blow out a user's affinity profile with
// one bogus reading. A person genuinely reading a single article for five
// minutes straight is already generous signal.
const MAX_DWELL_MS_PER_BEACON = 5 * 60 * 1000;

// Hit via navigator.sendBeacon from the feed (per-card, once a card has
// been scrolled past) and from the article detail page (on navigate away/
// unload). Beacons are fire-and-forget by nature — the browser doesn't
// wait for a response — so this endpoint stays cheap and never throws
// back to a client that isn't listening anyway.
export async function POST({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	// Anonymous readers don't get a personalized feed, so there's nothing
	// useful to attribute a view to — skip silently rather than erroring,
	// since sendBeacon can't do anything with an error response anyway.
	if (!session?.user) {
		return json({ success: true, tracked: false });
	}
	const userId = Number(session.user.id);

	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	// sendBeacon delivers a Blob; content-type is often lost in transit, so
	// parse leniently rather than requiring application/json.
	const raw = await request.text().catch(() => '');
	let dwellMs = 0;
	try {
		const body = JSON.parse(raw || '{}');
		dwellMs = Math.max(0, Math.min(Number(body?.dwellMs) || 0, MAX_DWELL_MS_PER_BEACON));
	} catch {
		// malformed beacon body — treat as a bare "viewed" ping with no dwell
	}

	try {
		await db
			.insert(newsArticleView)
			.values({ userId, articleId, dwellMs, viewCount: 1 })
			.onConflictDoUpdate({
				target: [newsArticleView.userId, newsArticleView.articleId],
				set: {
					dwellMs: sql`${newsArticleView.dwellMs} + ${dwellMs}`,
					viewCount: sql`${newsArticleView.viewCount} + 1`,
					lastViewedAt: sql`now()`
				}
			});

		return json({ success: true, tracked: true });
	} catch (err) {
		console.error('Failed to record news article view:', err);
		// Still 200 — this is best-effort telemetry, not something the
		// client should retry or surface to the user.
		return json({ success: false }, { status: 200 });
	}
}
