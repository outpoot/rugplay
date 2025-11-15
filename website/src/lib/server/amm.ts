import { db } from '$lib/server/db';
import { coin, transaction, priceHistory, userPortfolio } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { createNotification } from '$lib/server/notification';

function toNumber(v: any, fallback = 0) {
	return Number(v ?? fallback) || fallback;
}

function round(val: number, decimals = 8) {
	const p = Math.pow(10, decimals);
	return Math.round(val * p) / p;
}

export async function calculate24hMetrics(coinId: number, currentPrice: number) {
	const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	try {
		const [priceData] = await db
			.select({ price: priceHistory.price })
			.from(priceHistory)
			.where(
				and(
					eq(priceHistory.coinId, coinId),
					gte(priceHistory.timestamp, twentyFourHoursAgo)
				)
			)
			.orderBy(priceHistory.timestamp)
			.limit(1);

		let change24h = 0;
		if (priceData && priceData.price != null) {
			const priceFrom24hAgo = toNumber(priceData.price, 0);
			if (priceFrom24hAgo > 0 && currentPrice > 0) {
				change24h = ((currentPrice - priceFrom24hAgo) / priceFrom24hAgo) * 100;
			}
		}

		const volumeData = await db
			.select({ totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount })
			.from(transaction)
			.where(
				and(
					eq(transaction.coinId, coinId),
					gte(transaction.timestamp, twentyFourHoursAgo)
				)
			);

		const volume24h = (volumeData || []).reduce((sum: number, tx: any) => sum + toNumber(tx.totalBaseCurrencyAmount, 0), 0);

		return { change24h: Number(round(change24h, 4).toFixed(4)), volume24h: Number(round(volume24h, 4).toFixed(4)) };
	} catch (error) {
		console.error('Error calculating 24h metrics:', error);
		return { change24h: 0, volume24h: 0 };
	}
}

export async function executeSellTrade(
	tx: any,
	coinData: any,
	userId: number,
	quantity: number
) {
	if (!tx) throw new Error('Transaction context is required');
	const qty = toNumber(quantity, 0);
	if (qty <= 0) throw new Error('Quantity must be greater than zero');

	const poolCoinAmount = toNumber(coinData.poolCoinAmount, 0);
	const poolBaseCurrencyAmount = toNumber(coinData.poolBaseCurrencyAmount, 0);
	const currentPrice = toNumber(coinData.currentPrice, 0);

	if (poolCoinAmount <= 0 || poolBaseCurrencyAmount <= 0 || currentPrice <= 0) {
		throw new Error('Liquidity pool is not properly initialized or is empty');
	}

	const k = poolCoinAmount * poolBaseCurrencyAmount;
	const newPoolCoin = poolCoinAmount + qty;
	if (newPoolCoin <= 0) {
		throw new Error('Invalid resulting pool coin amount');
	}

	const newPoolBaseCurrency = k / newPoolCoin;
	const baseCurrencyReceived = poolBaseCurrencyAmount - newPoolBaseCurrency;

	const newPrice = newPoolBaseCurrency / newPoolCoin;

	if (!isFinite(baseCurrencyReceived) || baseCurrencyReceived <= 0 || !isFinite(newPrice) || newPoolBaseCurrency < 1) {
		const fallbackValue = qty * currentPrice;
		return {
			success: false,
			fallbackValue,
			newPrice: currentPrice,
			priceImpact: 0
		};
	}

	const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;

	const pricePerCoin = baseCurrencyReceived / qty;

	try {
		await tx.insert(transaction).values({
			userId,
			coinId: coinData.id,
			type: 'SELL',
			quantity: qty.toString(),
			pricePerCoin: pricePerCoin.toString(),
			totalBaseCurrencyAmount: baseCurrencyReceived.toString(),
			timestamp: new Date()
		});

		await tx.insert(priceHistory).values({
			coinId: coinData.id,
			price: newPrice.toString(),
			timestamp: new Date()
		});

		const metrics = await calculate24hMetrics(coinData.id, newPrice);

		const circSupply = toNumber(coinData.circulatingSupply, 0);
		const marketCap = circSupply > 0 ? circSupply * newPrice : 0;

		await tx.update(coin)
			.set({
				currentPrice: newPrice.toString(),
				marketCap: marketCap.toString(),
				poolCoinAmount: newPoolCoin.toString(),
				poolBaseCurrencyAmount: newPoolBaseCurrency.toString(),
				change24h: metrics.change24h.toString(),
				volume24h: metrics.volume24h.toString(),
				updatedAt: new Date()
			})
			.where(eq(coin.id, coinData.id));

		const isRugPull = priceImpact < -20 && baseCurrencyReceived > 1000;
		if (isRugPull) {
			(async () => {
				try {
					const affectedUsers = await db
						.select({
							userId: userPortfolio.userId,
							quantity: userPortfolio.quantity
						})
						.from(userPortfolio)
						.where(eq(userPortfolio.coinId, coinData.id));

					for (const holder of affectedUsers) {
						if (holder.userId === userId) continue;

						const holdingQty = toNumber(holder.quantity, 0);
						const holdingValue = holdingQty * newPrice;
						if (holdingValue > 10) {
							try {
								await createNotification(
									holder.userId.toString(),
									'RUG_PULL',
									'Coin rugpulled!',
									`A coin you owned, ${coinData.name} (*${coinData.symbol}), crashed ${Math.abs(round(priceImpact, 1)).toFixed(1)}%!`,
									`/coin/${coinData.symbol}`
								);
							} catch (err) {
								console.error('Failed to create notification for user', holder.userId, err);
							}
						}
					}
				} catch (error) {
					console.error('Error sending rug pull notifications:', error);
				}
			})();
		}

		return {
			success: true,
			baseCurrencyReceived,
			newPrice,
			priceImpact,
			newPoolCoin,
			newPoolBaseCurrency,
			metrics
		};
	} catch (error) {
		console.error('Error executing sell trade:', error);
		const fallbackValue = qty * currentPrice;
		return {
			success: false,
			fallbackValue,
			newPrice: currentPrice,
			priceImpact: 0
		};
	}
}
