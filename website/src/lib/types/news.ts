export type NewsArticleType =
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

export interface NewsRelatedCoin {
	id: number;
	name: string;
	symbol: string;
	icon: string | null;
}

export interface NewsRelatedUser {
	id: number;
	username: string;
	name: string;
	image: string | null;
	nameColor: string | null;
}

export interface NewsArticle {
	id: number;
	type: NewsArticleType;
	source: 'AI' | 'TEMPLATE';
	headline: string;
	summary: string;
	body: string;
	coverImage: string | null;
	coverImageAttribution: string | null;
	relatedCoinId: number | null;
	relatedUserId: number | null;
	relatedQuestionId: number | null;
	metadata: Record<string, unknown> | null;
	likesCount: number;
	dislikesCount: number;
	sharesCount: number;
	viewsCount: number;
	isPinned: boolean;
	createdAt: string;
	relatedCoin: NewsRelatedCoin | null;
	relatedUser: NewsRelatedUser | null;
	myReaction: 'LIKE' | 'DISLIKE' | null;
}

export type NewsFeedSort = 'foryou' | 'latest' | 'trending';
export type NewsLayout = 'feed' | 'magazine';
