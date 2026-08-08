export type ChangeCategory = 'new' | 'improved' | 'fixed' | 'removed';

export interface ChangeEntry {
	category: ChangeCategory;
	text: string;
}

export interface ChangelogRelease {
	version: string; // e.g. "2.4.0"
	date: string; // ISO date string, e.g. "2026-08-08"
	title?: string; // optional flavor headline for the release
	summary?: string; // short blurb under the headline
	changes: ChangeEntry[];
}

// Edit this array to publish new updates. Newest release should be first.
export const CHANGELOG: ChangelogRelease[] = [
	{
		version: '2.4.0',
		date: '2026-08-08',
		title: 'Gems, Prestige & the Great Sidebar Cleanup',
		summary: 'A big one — new currency, a fresh way to flex, and a bunch of squashed bugs.',
		changes: [
			{ category: 'new', text: 'Introduced Gems, a premium currency earnable through achievements and the shop' },
			{ category: 'new', text: 'Added Prestige — reset your portfolio for permanent account-wide bonuses' },
			{ category: 'new', text: 'Treemap view for visualizing the entire market at a glance' },
			{ category: 'improved', text: 'Live Trades feed now updates over WebSocket instead of polling' },
			{ category: 'improved', text: 'Portfolio summary loads noticeably faster on first paint' },
			{ category: 'fixed', text: 'Fixed a bug where daily rewards could be claimed twice in fast succession' },
			{ category: 'fixed', text: 'Fixed coin symbols with unicode characters breaking the share card renderer' }
		]
	},
	{
		version: '2.3.1',
		date: '2026-07-22',
		title: 'Hopium Hotfix',
		summary: 'Quick patch after the Hopium prediction markets launch.',
		changes: [
			{ category: 'fixed', text: 'Fixed Hopium markets occasionally settling with the wrong outcome' },
			{ category: 'fixed', text: 'Fixed notification badge count not clearing after reading all notifications' },
			{ category: 'improved', text: 'Reduced API rate-limit false positives on the /market page' }
		]
	},
	{
		version: '2.3.0',
		date: '2026-07-15',
		title: 'Hopium Launches',
		summary: 'Bet on the future. Or don\u2019t. Your call.',
		changes: [
			{ category: 'new', text: 'Hopium prediction markets — bet on real crypto and market outcomes' },
			{ category: 'new', text: 'Arcade section with mini-games for quick side bets' },
			{ category: 'improved', text: 'Redesigned the achievements page with progress bars' },
			{ category: 'removed', text: 'Removed the legacy /explore page in favor of /market' }
		]
	},
	{
		version: '2.2.0',
		date: '2026-06-30',
		title: 'Season One',
		summary: 'The leaderboard resets. The rugpulls continue.',
		changes: [
			{ category: 'new', text: 'Seasonal leaderboards with end-of-season rewards' },
			{ category: 'new', text: 'Promo codes — redeem codes for bonus cash and gems' },
			{ category: 'improved', text: 'Candlestick charts now support 1h, 4h, and 1d intervals' },
			{ category: 'fixed', text: 'Fixed portfolio value briefly flashing $0 on page load' }
		]
	}
];

export function getLatestVersion(): string {
	return CHANGELOG[0]?.version ?? '0.0.0';
}
