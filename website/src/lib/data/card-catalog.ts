import type { Rarity } from './shop-catalog';

/**
 * Profile card cosmetics — visual styles for the header card on a user's
 * profile page, plus interaction animations layered on top of it. Both are
 * achievement-granted only (price: null everywhere, same convention as the
 * 'ascended' mythical name color): there is currently no shop purchase flow
 * for these, they're unlocked by playing.
 *
 * `key: null` in each catalog represents "no style" / "no animation" (the
 * default, unstyled card) so components have an explicit, typed way to
 * express "nothing equipped" without relying on `undefined`.
 */

export interface CardStyleItem {
	key: string;
	label: string;
	description: string;
	rarity: Rarity;
	price: null; // achievement-granted only, not sold in the shop
	/** Classes applied to the card's root element. */
	classes: string;
	/** Inline style applied to the card's root element, if needed. */
	style?: string;
	/** Achievement id that grants this style, for display/tooltip purposes. */
	achievementId: string;
}

export interface CardAnimationItem {
	key: string;
	label: string;
	description: string;
	rarity: Rarity;
	price: null;
	/** Classes applied on hover (group-hover pattern — see ProfileCard.svelte). */
	hoverClasses: string;
	/** Classes applied on active/click. */
	activeClasses: string;
	achievementId: string;
}

export const CARD_STYLE_CATALOG: CardStyleItem[] = [
	{
		key: 'glass',
		label: 'Glass',
		description: 'A frosted, translucent card with a soft blur behind it.',
		rarity: 'rare',
		price: null,
		classes: 'profile-card-glass',
		achievementId: 'trades_50',
	},
	{
		key: 'clear',
		label: 'Clear',
		description: 'A fully transparent card — just a thin outline remains.',
		rarity: 'epic',
		price: null,
		classes: 'profile-card-clear',
		achievementId: 'portfolio_100k',
	},
	{
		key: 'invisible',
		label: 'Invisible',
		description: 'No card at all. Your avatar, name, and badges float directly on the page.',
		rarity: 'legendary',
		price: null,
		classes: 'profile-card-invisible',
		achievementId: 'portfolio_1m',
	},
	{
		key: 'gold_foil',
		label: 'Gold Foil',
		description: 'A brushed-gold card with a slow-moving shimmer.',
		rarity: 'legendary',
		price: null,
		classes: 'profile-card-gold-foil',
		achievementId: 'volume_10m',
	},
	{
		key: 'void',
		label: 'Void',
		description: 'A deep-space card with drifting stars behind your info.',
		rarity: 'mythical',
		price: null,
		classes: 'profile-card-void',
		achievementId: 'portfolio_100t',
	},
];

export const CARD_ANIMATION_CATALOG: CardAnimationItem[] = [
	{
		key: 'lift',
		label: 'Lift',
		description: 'The card gently rises and gains a shadow on hover.',
		rarity: 'uncommon',
		price: null,
		hoverClasses: 'profile-card-anim-lift-hover',
		activeClasses: 'profile-card-anim-lift-active',
		achievementId: 'first_arcade',
	},
	{
		key: 'tilt',
		label: 'Tilt',
		description: 'The card tilts toward your cursor, like a trading card.',
		rarity: 'rare',
		price: null,
		hoverClasses: 'profile-card-anim-tilt-hover',
		activeClasses: 'profile-card-anim-tilt-active',
		achievementId: 'trades_500',
	},
	{
		key: 'pulse',
		label: 'Pulse Glow',
		description: "A rhythmic glow pulses around the card's border.",
		rarity: 'epic',
		price: null,
		hoverClasses: 'profile-card-anim-pulse-hover',
		activeClasses: 'profile-card-anim-pulse-active',
		achievementId: 'win_streak_5',
	},
	{
		key: 'shine',
		label: 'Shine Sweep',
		description: 'A light sweeps across the card on hover, click makes it flash.',
		rarity: 'legendary',
		price: null,
		hoverClasses: 'profile-card-anim-shine-hover',
		activeClasses: 'profile-card-anim-shine-active',
		achievementId: 'prestige_5',
	},
];

export function getCardStyleByKey(key: string | null | undefined): CardStyleItem | undefined {
	if (!key) return undefined;
	return CARD_STYLE_CATALOG.find((s) => s.key === key);
}

export function getCardAnimationByKey(key: string | null | undefined): CardAnimationItem | undefined {
	if (!key) return undefined;
	return CARD_ANIMATION_CATALOG.find((a) => a.key === key);
}
