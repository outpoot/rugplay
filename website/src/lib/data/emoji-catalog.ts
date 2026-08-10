/**
 * Fixed allowlist of emoji that can be used as a news article reaction.
 * Deliberately native-Unicode-only — no custom image uploads — so the
 * reaction system can never be used to sneak in inappropriate imagery,
 * needs no moderation queue, and needs no object storage.
 *
 * Grouped for the picker UI. Keep entries short (they're stored as-is in
 * `newsArticleReactionEmoji.emoji`, varchar(16), which comfortably fits
 * any single emoji including multi-codepoint ones like flags/skin tones).
 */

export interface EmojiCatalogGroup {
	label: string;
	emoji: string[];
}

export const EMOJI_CATALOG: EmojiCatalogGroup[] = [
	{
		label: 'Market',
		emoji: ['🚀', '📈', '📉', '💎', '🐳', '🩸', '💰', '🤡']
	},
	{
		label: 'Reactions',
		emoji: ['😂', '😭', '😱', '🔥', '👀', '💀', '🙏', '😬']
	},
	{
		label: 'Hands',
		emoji: ['👍', '👎', '🙌', '🫡', '🤝', '👏']
	},
	{
		label: 'Misc',
		emoji: ['⚡', '🎉', '🏆', '🐂', '🐻', '⚰️']
	}
];

const ALLOWED_EMOJI_SET = new Set(EMOJI_CATALOG.flatMap((g) => g.emoji));

export function isAllowedReactionEmoji(value: string): boolean {
	return ALLOWED_EMOJI_SET.has(value);
}
