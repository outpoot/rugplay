/**
 * Picks a cover image for article types that don't have a natural image
 * of their own (a coin icon, a user avatar). Uses Unsplash's source
 * photo IDs (specific, curated, royalty-free under the Unsplash License)
 * rather than a random/keyword endpoint, so images stay on-theme and
 * don't require an API key.
 *
 * If you'd rather self-host these, download each once and swap the URL
 * for a `/images/news/<file>` path served from `static/`.
 */

import type { NewsEventType } from './types';

// A handful of curated photo IDs per theme. Unsplash's CDN accepts size
// params directly in the URL (?w=&q=&fm=) — no API key needed for this
// "source" style of usage.
const UNSPLASH_BASE = 'https://images.unsplash.com';

const POOLS: Record<string, string[]> = {
	crash: [
		`${UNSPLASH_BASE}/photo-1590283603385-17ffb3a7f29f`, // red stock chart down
		`${UNSPLASH_BASE}/photo-1611974789855-9c2a0a7236a3`, // falling chart
		`${UNSPLASH_BASE}/photo-1642790106117-e829e14a795f` // crypto crash
	],
	pump: [
		`${UNSPLASH_BASE}/photo-1611974789855-9c2a0a7236a3`,
		`${UNSPLASH_BASE}/photo-1621761191319-c6fb62004040`, // green candles up
		`${UNSPLASH_BASE}/photo-1639762681485-074b7f938ba0`
	],
	launch: [
		`${UNSPLASH_BASE}/photo-1621504450181-5d356f61d307`, // rocket / launch
		`${UNSPLASH_BASE}/photo-1517976487492-5750f3195933` // stars/space
	],
	prediction: [
		`${UNSPLASH_BASE}/photo-1454165804606-c3d57bc86b40`, // crystal ball / question
		`${UNSPLASH_BASE}/photo-1551288049-bebda4e38f71`
	],
	whale: [
		`${UNSPLASH_BASE}/photo-1568430462989-44163eb1752f`, // ocean / whale-ish
		`${UNSPLASH_BASE}/photo-1518399681705-1c1a55e5e883`
	],
	leaderboard: [
		`${UNSPLASH_BASE}/photo-1552664730-d307ca884978`, // trophy
		`${UNSPLASH_BASE}/photo-1546519638-68e109498ffc`
	],
	season: [`${UNSPLASH_BASE}/photo-1519681393784-d120267933ba`],
	general: [
		`${UNSPLASH_BASE}/photo-1526304640581-d334cdbbf45e`, // generic finance/news desk
		`${UNSPLASH_BASE}/photo-1495020689067-958852a7765e`
	]
};

function poolFor(type: NewsEventType): string[] {
	switch (type) {
		case 'RUG_PULL':
			return POOLS.crash;
		case 'COIN_PUMP':
			return POOLS.pump;
		case 'COIN_CREATED':
			return POOLS.launch;
		case 'HOPIUM_RESOLVED':
		case 'HOPIUM_TRENDING':
			return POOLS.prediction;
		case 'WHALE_TRADE':
			return POOLS.whale;
		case 'LEADERBOARD_SHAKEUP':
			return POOLS.leaderboard;
		case 'SEASON_EVENT':
			return POOLS.season;
		default:
			return POOLS.general;
	}
}

export function pickCoverImage(
	type: NewsEventType,
	seed: number
): { url: string; attribution: string } {
	const pool = poolFor(type);
	const photoBase = pool[Math.abs(seed) % pool.length];
	return {
		// w=1200 keeps file size reasonable for a card/hero image.
		url: `${photoBase}?w=1200&q=80&fm=jpg&fit=crop`,
		attribution: 'Photo via Unsplash'
	};
}
