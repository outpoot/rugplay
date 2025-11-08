import type { PageServerLoad } from './$types';
import type { MarketFilters } from '$lib/types/market';

export const load: PageServerLoad = async ({ url }): Promise<{ filters: MarketFilters }> => {
	return {
		filters: {
			searchQuery: url.searchParams.get('search') || '',
			sortBy: url.searchParams.get('sortBy') || 'marketCap',
			sortOrder: url.searchParams.get('sortOrder') || 'desc',
			priceFilter: url.searchParams.get('priceFilter') || 'all',
			changeFilter: url.searchParams.get('changeFilter') || 'all',
			page: Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1)
		}
	};
};
