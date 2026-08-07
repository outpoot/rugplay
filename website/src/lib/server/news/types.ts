export type NewsEventType =
	| 'RUG_PULL'
	| 'COIN_PUMP'
	| 'COIN_CREATED'
	| 'COIN_MILESTONE'
	| 'HOPIUM_RESOLVED'
	| 'HOPIUM_TRENDING'
	| 'WHALE_TRADE'
	| 'LEADERBOARD_SHAKEUP'
	| 'SEASON_EVENT'
	| 'PLATFORM';

export interface NewsEventInput {
	type: NewsEventType;
	// Free-form event payload — shape depends on `type`, see templates.ts
	// and ai.ts for the fields each type expects.
	metadata: Record<string, unknown>;
	relatedCoinId?: number;
	relatedUserId?: number;
	relatedQuestionId?: number;
	// Optional explicit cover image (S3 key or https URL). If omitted,
	// the pipeline picks a sensible default (coin icon, stock photo, etc).
	coverImage?: string;
	coverImageAttribution?: string;
}
