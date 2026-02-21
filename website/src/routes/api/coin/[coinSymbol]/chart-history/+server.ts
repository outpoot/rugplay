import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, priceHistory, transaction } from '$lib/server/db/schema';
import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { timeToLocal } from '$lib/utils';

function aggregatePriceHistory(priceData: any[], intervalMinutes: number = 60) {
    if (priceData.length === 0) return [];

    const sortedData = priceData.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const intervalMs = intervalMinutes * 60 * 1000;
    const candlesticks = new Map();

    sortedData.forEach(point => {
        const timestamp = new Date(point.timestamp).getTime();
        const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs;

        if (!candlesticks.has(intervalStart)) {
            candlesticks.set(intervalStart, {
                time: timeToLocal(Math.floor(intervalStart / 1000)),
                open: point.price,
                high: point.price,
                low: point.price,
                close: point.price,
                firstTimestamp: timestamp,
                lastTimestamp: timestamp
            });
        } else {
            const candle = candlesticks.get(intervalStart);
            candle.high = Math.max(candle.high, point.price);
            candle.low = Math.min(candle.low, point.price);

            if (timestamp < candle.firstTimestamp) {
                candle.open = point.price;
                candle.firstTimestamp = timestamp;
            }

            if (timestamp > candle.lastTimestamp) {
                candle.close = point.price;
                candle.lastTimestamp = timestamp;
            }
        }
    });

    const candleArray = Array.from(candlesticks.values()).sort((a, b) => a.time - b.time);
    const fixedCandles = [];
    let lastClose = null;
    const PRICE_CHANGE_THRESHOLD = 0.01;

    for (const candle of candleArray) {
        if (lastClose !== null && Math.abs(candle.open - lastClose) > lastClose * PRICE_CHANGE_THRESHOLD) {
            candle.open = lastClose;
            candle.high = Math.max(candle.high, lastClose);
            candle.low = Math.min(candle.low, lastClose);
        }

        const finalCandle = {
            time: candle.time,
            open: candle.open,
            high: Math.max(candle.open, candle.close, candle.high),
            low: Math.min(candle.open, candle.close, candle.low),
            close: candle.close
        };

        fixedCandles.push(finalCandle);
        lastClose = finalCandle.close;
    }

    return fixedCandles;
}

function aggregateVolumeData(transactionData: any[], intervalMinutes: number = 60) {
    if (transactionData.length === 0) return [];

    const sortedData = transactionData.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const intervalMs = intervalMinutes * 60 * 1000;
    const volumeMap = new Map();

    sortedData.forEach(tx => {
        const timestamp = new Date(tx.timestamp).getTime();
        const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs;

        if (!volumeMap.has(intervalStart)) {
            volumeMap.set(intervalStart, {
                time: timeToLocal(Math.floor(intervalStart / 1000)),
                volume: 0
            });
        }

        const volumePoint = volumeMap.get(intervalStart);
        volumePoint.volume += tx.totalBaseCurrencyAmount;
    });

    return Array.from(volumeMap.values()).sort((a, b) => a.time - b.time);
}

function getWindowHours(timeframe: string): number {
    switch (timeframe) {
        case '1m': return 24;
        case '5m': return 24;
        case '15m': return 72;
        case '1h': return 168;
        case '4h': return 720;
        case '1d': return 2160;
        default: return 24;
    }
}

export async function GET({ params, url }) {
    const coinSymbol = params.coinSymbol?.toUpperCase();
    const timeframe = url.searchParams.get('timeframe') || '1m';
    const beforeParam = url.searchParams.get('before');

    if (!coinSymbol) {
        throw error(400, 'Coin symbol is required');
    }

    if (!beforeParam) {
        throw error(400, '"before" timestamp parameter is required');
    }

    const beforeTimestamp = parseInt(beforeParam, 10);
    if (isNaN(beforeTimestamp)) {
        throw error(400, 'Invalid "before" timestamp');
    }

    const timeframeMap = {
        '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440
    } as const;
    const intervalMinutes = timeframeMap[timeframe as keyof typeof timeframeMap] || 1;

    try {
        const [coinData] = await db
            .select({ id: coin.id })
            .from(coin)
            .where(eq(coin.symbol, coinSymbol))
            .limit(1);

        if (!coinData) {
            throw error(404, 'Coin not found');
        }

        const windowHours = getWindowHours(timeframe);
        const beforeDate = new Date(beforeTimestamp * 1000);
        const sinceDate = new Date(beforeDate.getTime() - windowHours * 60 * 60 * 1000);

        const [rawPriceHistory, rawTransactions] = await Promise.all([
            db.select({ price: priceHistory.price, timestamp: priceHistory.timestamp })
                .from(priceHistory)
                .where(and(
                    eq(priceHistory.coinId, coinData.id),
                    gte(priceHistory.timestamp, sinceDate),
                    lt(priceHistory.timestamp, beforeDate)
                ))
                .orderBy(desc(priceHistory.timestamp))
                .limit(5000),

            db.select({
                totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount,
                timestamp: transaction.timestamp
            })
                .from(transaction)
                .where(and(
                    eq(transaction.coinId, coinData.id),
                    gte(transaction.timestamp, sinceDate),
                    lt(transaction.timestamp, beforeDate)
                ))
                .orderBy(desc(transaction.timestamp))
                .limit(5000)
        ]);

        const priceData = rawPriceHistory.map(p => ({
            price: Number(p.price),
            timestamp: p.timestamp
        }));

        const transactionData = rawTransactions.map(t => ({
            totalBaseCurrencyAmount: Number(t.totalBaseCurrencyAmount),
            timestamp: t.timestamp
        }));

        const candlestickData = aggregatePriceHistory(priceData, intervalMinutes);
        const volumeData = aggregateVolumeData(transactionData, intervalMinutes);

        const oldestTimestamp = candlestickData.length > 0 ? candlestickData[0].time : null;

        return json({
            candlestickData,
            volumeData,
            oldestTimestamp,
            noMoreData: candlestickData.length === 0
        });
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }

        console.error('Unexpected error in chart-history API:', e);
        throw error(500, 'Internal server error');
    }
}
