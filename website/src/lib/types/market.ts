export interface CoinData {
	symbol: string;
	name: string;
	icon: string;
	currentPrice: number;
	marketCap: number;
	volume24h: number;
	change24h: number;
	createdAt: string;
	creatorName: string | null;
}

export interface MarketFilters {
	searchQuery: string;
	sortBy: string;
	sortOrder: string;
	priceFilter: string;
	changeFilter: string;
	page: number;
}

export interface MarketResponse {
	coins: CoinData[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface FilterOption {
	value: string;
	label: string;
}

export interface VolatilityBadge {
	text: string;
	variant: 'default' | 'secondary' | 'outline';
}
