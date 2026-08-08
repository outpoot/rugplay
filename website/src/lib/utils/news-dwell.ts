import { browser } from '$app/environment';

/**
 * Tracks how long a news article/card is actually visible on screen and
 * reports it to the server as personalization signal (see
 * lib/server/news/ranking.ts and routes/api/news/[id]/view).
 *
 * Usage, from a component's onMount:
 *
 *   onMount(() => {
 *     if (!el) return;
 *     return trackArticleDwell(articleId, el);
 *   });
 *
 * onMount's cleanup function calls the returned teardown, which flushes
 * whatever time accumulated and disconnects the observer — covers both
 * "card scrolled out of the feed" and "component unmounted" without
 * double-counting.
 *
 * Time only accumulates while the element is intersecting the viewport
 * AND the tab itself is visible (document.visibilityState), so a card
 * sitting in a backgrounded tab doesn't rack up fake dwell time.
 */

const VISIBILITY_THRESHOLD = 0.5; // at least half the card/article on screen counts as "visible"
const FLUSH_INTERVAL_MS = 15_000; // periodic flush so a long single read isn't lost if the tab is killed

/**
 * Simpler variant of trackArticleDwell for a dedicated article detail
 * page, where the "is it visible" question isn't about scroll position
 * within a feed but just "is this tab open and focused". Reading the
 * article page for two minutes should count as a much stronger signal
 * than a card glimpsed mid-scroll, and this is where that mostly comes
 * from.
 */
export function trackArticlePageDwell(articleId: number): () => void {
	if (!browser) return () => {};

	let visibleSinceMs: number | null = document.visibilityState === 'visible' ? Date.now() : null;
	let accumulatedMs = 0;
	let flushTimer: ReturnType<typeof setInterval> | null = null;

	function markHiddenAndAccumulate() {
		if (visibleSinceMs !== null) {
			accumulatedMs += Date.now() - visibleSinceMs;
			visibleSinceMs = null;
		}
	}

	function flush(useBeacon: boolean) {
		markHiddenAndAccumulate();
		if (accumulatedMs <= 0) return;

		const dwellMs = accumulatedMs;
		accumulatedMs = 0;

		const payload = JSON.stringify({ dwellMs });
		const url = `/api/news/${articleId}/view`;

		if (useBeacon && navigator.sendBeacon) {
			navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
		} else {
			fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: payload,
				keepalive: true
			}).catch(() => {});
		}
	}

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
			if (visibleSinceMs === null) visibleSinceMs = Date.now();
		} else {
			markHiddenAndAccumulate();
		}
	}
	document.addEventListener('visibilitychange', handleVisibilityChange);

	flushTimer = setInterval(() => flush(false), FLUSH_INTERVAL_MS);

	function handlePageHide() {
		flush(true);
	}
	window.addEventListener('pagehide', handlePageHide);
	window.addEventListener('beforeunload', handlePageHide);

	return () => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('pagehide', handlePageHide);
		window.removeEventListener('beforeunload', handlePageHide);
		if (flushTimer) clearInterval(flushTimer);
		flush(true);
	};
}

export function trackArticleDwell(articleId: number, el: HTMLElement): () => void {
	if (!browser) return () => {};

	let visibleSinceMs: number | null = null;
	let accumulatedMs = 0;
	let flushTimer: ReturnType<typeof setInterval> | null = null;

	function isTabVisible() {
		return document.visibilityState === 'visible';
	}

	function markVisible() {
		if (visibleSinceMs === null && isTabVisible()) {
			visibleSinceMs = Date.now();
		}
	}

	function markHiddenAndAccumulate() {
		if (visibleSinceMs !== null) {
			accumulatedMs += Date.now() - visibleSinceMs;
			visibleSinceMs = null;
		}
	}

	function flush(useBeacon: boolean) {
		markHiddenAndAccumulate();
		if (accumulatedMs <= 0) return;

		const dwellMs = accumulatedMs;
		accumulatedMs = 0;

		const payload = JSON.stringify({ dwellMs });
		const url = `/api/news/${articleId}/view`;

		if (useBeacon && navigator.sendBeacon) {
			// sendBeacon needs a Blob with an explicit type for the server to
			// receive it as JSON-ish text reliably across browsers.
			navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
		} else {
			fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: payload,
				keepalive: true
			}).catch(() => {
				// best-effort telemetry, nothing to recover here
			});
		}
	}

	const observer = new IntersectionObserver(
		(entries) => {
			const entry = entries[0];
			if (!entry) return;
			if (entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
				markVisible();
			} else {
				markHiddenAndAccumulate();
			}
		},
		{ threshold: [0, VISIBILITY_THRESHOLD, 1] }
	);
	observer.observe(el);

	function handleVisibilityChange() {
		if (isTabVisible()) {
			// Resume timing only if the element is still actually on screen —
			// re-observing isn't necessary since the observer keeps firing,
			// but a tab switch back doesn't retroactively mark visible unless
			// the element itself is currently intersecting, so just let the
			// next intersection callback (or the current cached state) handle
			// it naturally. Nothing to do here beyond ensuring hidden time
			// wasn't counted, which markHiddenAndAccumulate below already did.
		} else {
			markHiddenAndAccumulate();
		}
	}
	document.addEventListener('visibilitychange', handleVisibilityChange);

	// Periodic flush so a person reading one article for several minutes
	// still contributes signal even if they never navigate away cleanly
	// (closed tab, crashed browser, force-quit app).
	flushTimer = setInterval(() => flush(false), FLUSH_INTERVAL_MS);

	// Final flush on page unload — sendBeacon is the only reliable way to
	// get a request out during unload, fetch with keepalive is the fallback
	// for browsers/contexts where sendBeacon isn't available.
	function handlePageHide() {
		flush(true);
	}
	window.addEventListener('pagehide', handlePageHide);
	window.addEventListener('beforeunload', handlePageHide);

	return () => {
		observer.disconnect();
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('pagehide', handlePageHide);
		window.removeEventListener('beforeunload', handlePageHide);
		if (flushTimer) clearInterval(flushTimer);
		flush(true);
	};
}
