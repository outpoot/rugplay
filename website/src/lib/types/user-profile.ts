export interface UserProfile {
	id: number;
	name: string;
	username: string;
	bio: string | null;
	image: string | null;
	createdAt: Date;
	baseCurrencyBalance: number;
	isAdmin: boolean;
	totalPortfolioValue: number;
	loginStreak: number;

	prestigeLevel: number | null;
	halloweenBadge2025: boolean;

	gamblingWins: number;
	gamblingLosses: number;
}

export interface UserStats {
	totalPortfolioValue: number;
	baseCurrencyBalance: number;
	holdingsValue: number;
	holdingsCount: number;
	coinsCreated: number;
	totalTransactions: number;
	totalBuyVolume: number;
	totalSellVolume: number;
	transactions24h: number;
	buyVolume24h: number;
	sellVolume24h: number;
}

export interface CreatedCoin {
	id: number;
	name: string;
	symbol: string;
	icon: string | null;
	currentPrice: string;
	marketCap: string;
	volume24h: string;
	change24h: string;
	createdAt: Date;
}

export interface RecentTransaction {
	id: number;
	type: 'BUY' | 'SELL';
	coinSymbol: string;
	coinName: string;
	coinIcon: string | null;
	quantity: string;
	pricePerCoin: string;
	totalBaseCurrencyAmount: string;
	timestamp: Date;
}

export interface UserProfileData {
	profile: UserProfile;
	stats: UserStats;
	createdCoins: CreatedCoin[];
	recentTransactions: RecentTransaction[];
}
