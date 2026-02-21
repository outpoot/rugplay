import { error } from '@sveltejs/kit';

export async function load({ params, url, fetch }) {
    const { coinSymbol } = params;
    const timeframe = url.searchParams.get('timeframe') || '1m';

    try {
        const response = await fetch(`/api/coin/${coinSymbol}?timeframe=${timeframe}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw error(404, 'Coin not found');
            }
            throw error(500, 'Failed to load coin data');
        }

        const result = await response.json();
        
        return {
            coinSymbol,
            coin: result.coin,
            chartData: result.candlestickData || [],
            volumeData: result.volumeData || [],
            timeframe,
            oldestTimestamp: result.oldestTimestamp || null
        };
    } catch (e) {
        console.error('Failed to fetch coin data:', e);
        throw error(500, 'Failed to load coin data');
    }
}
