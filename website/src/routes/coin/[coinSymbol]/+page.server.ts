import { error } from '@sveltejs/kit';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

export async function load({ params, url, fetch, cookies }) {
    const { coinSymbol } = params;
    // An explicit ?timeframe= wins, then whatever the player last picked.
    const remembered = cookies.get('chart_timeframe');
    const timeframe =
        url.searchParams.get('timeframe') ||
        (remembered && TIMEFRAMES.includes(remembered) ? remembered : '1m');

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
