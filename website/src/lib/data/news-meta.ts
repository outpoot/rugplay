// NOTE: only icon names already confirmed in use elsewhere in this codebase
// (AppSidebar.svelte, leaderboard/+page.svelte) are used here, since the
// full @hugeicons/core-free-icons export list couldn't be checked in this
// environment (node_modules wasn't in the uploaded zip). If any of these
// don't exist in your installed version, swap for another icon from the
// same package — the app already imports dozens from it successfully.
import {
	SkullIcon,
	TradeUpIcon,
	Coins02Icon,
	ChampionIcon,
	JusticeScale01Icon,
	SparklesIcon,
	Wallet01Icon,
	CrownIcon,
	Calendar01Icon,
	Globe02Icon
} from '@hugeicons/core-free-icons';
import type { NewsArticleType } from '$lib/types/news';

export const NEWS_TYPE_META: Record<
	NewsArticleType,
	{ label: string; icon: any; badgeClass: string }
> = {
	RUG_PULL: {
		label: 'Rug Pull',
		icon: SkullIcon,
		badgeClass: 'bg-red-500/15 text-red-500 border-red-500/30'
	},
	COIN_PUMP: {
		label: 'Pump',
		icon: TradeUpIcon,
		badgeClass: 'bg-green-500/15 text-green-500 border-green-500/30'
	},
	COIN_CREATED: {
		label: 'New Coin',
		icon: Coins02Icon,
		badgeClass: 'bg-blue-500/15 text-blue-500 border-blue-500/30'
	},
	COIN_MILESTONE: {
		label: 'Milestone',
		icon: ChampionIcon,
		badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30'
	},
	HOPIUM_RESOLVED: {
		label: 'Hopium Review',
		icon: JusticeScale01Icon,
		badgeClass: 'bg-purple-500/15 text-purple-500 border-purple-500/30'
	},
	HOPIUM_TRENDING: {
		label: 'Trending Bet',
		icon: SparklesIcon,
		badgeClass: 'bg-orange-500/15 text-orange-500 border-orange-500/30'
	},
	WHALE_TRADE: {
		label: 'Whale Trade',
		icon: Wallet01Icon,
		badgeClass: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'
	},
	LEADERBOARD_SHAKEUP: {
		label: 'Leaderboard',
		icon: CrownIcon,
		badgeClass: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
	},
	SEASON_EVENT: {
		label: 'Season',
		icon: Calendar01Icon,
		badgeClass: 'bg-pink-500/15 text-pink-500 border-pink-500/30'
	},
	PLATFORM: {
		label: 'Rugplay News',
		icon: Globe02Icon,
		badgeClass: 'bg-primary/15 text-primary border-primary/30'
	}
};
