import { user, userPortfolio, transaction, coin, priceHistory } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

const BATCH_CHUNK_SIZE = 500;
const MAX_STORABLE = 1e38;

export async function liquidateHoldings(tx: any, userId: number): Promise<{
	totalSaleValue: number;
	coinsSold: number;
}> {
	const holdings = await tx
		.select({
			coinId: userPortfolio.coinId,
			quantity: userPortfolio.quantity,
			currentPrice: coin.currentPrice,
			symbol: coin.symbol,
			poolCoinAmount: coin.poolCoinAmount,
			poolBaseCurrencyAmount: coin.poolBaseCurrencyAmount,
			circulatingSupply: coin.circulatingSupply
		})
		.from(userPortfolio)
		.leftJoin(coin, eq(userPortfolio.coinId, coin.id))
		.where(eq(userPortfolio.userId, userId));

	if (holdings.length === 0) {
		return { totalSaleValue: 0, coinsSold: 0 };
	}

	const now = new Date();
	let totalSaleValue = 0;

	const transactionRows: any[] = [];
	const priceHistoryRows: { coinId: number; price: string }[] = [];
	const coinUpdates: {
		id: number;
		newPrice: number;
		newPoolCoin: number;
		newPoolBaseCurrency: number;
		marketCap: number;
	}[] = [];

	for (const holding of holdings) {
		const quantity = Number(holding.quantity);
		const poolCoinAmount = Number(holding.poolCoinAmount);
		const poolBaseCurrencyAmount = Number(holding.poolBaseCurrencyAmount);

		if (poolCoinAmount <= 0 || poolBaseCurrencyAmount <= 0) {
			transactionRows.push({
				userId,
				coinId: holding.coinId!,
				type: 'SELL',
				quantity: holding.quantity!,
				pricePerCoin: '0',
				totalBaseCurrencyAmount: '0',
				timestamp: now
			});
			continue;
		}

		const k = poolCoinAmount * poolBaseCurrencyAmount;
		const newPoolCoin = poolCoinAmount + quantity;
		const newPoolBaseCurrency = k / newPoolCoin;
		const baseCurrencyReceived = poolBaseCurrencyAmount - newPoolBaseCurrency;
		const newPrice = newPoolBaseCurrency / newPoolCoin;

		if (baseCurrencyReceived <= 0 || newPoolBaseCurrency < 1) {
			transactionRows.push({
				userId,
				coinId: holding.coinId!,
				type: 'SELL',
				quantity: quantity.toString(),
				pricePerCoin: '0',
				totalBaseCurrencyAmount: '0',
				timestamp: now
			});
			continue;
		}

		totalSaleValue += baseCurrencyReceived;

		transactionRows.push({
			userId,
			coinId: holding.coinId!,
			type: 'SELL',
			quantity: quantity.toString(),
			pricePerCoin: (baseCurrencyReceived / quantity).toString(),
			totalBaseCurrencyAmount: baseCurrencyReceived.toString(),
			timestamp: now
		});

		priceHistoryRows.push({
			coinId: holding.coinId!,
			price: newPrice.toString()
		});

		const circulatingSupply = Number(holding.circulatingSupply);
		if (!circulatingSupply || !isFinite(circulatingSupply)) continue;

		const safeMarketCap = Math.min(circulatingSupply * newPrice, MAX_STORABLE);

		if (
			!isFinite(newPrice) ||
			!isFinite(newPoolCoin) ||
			!isFinite(newPoolBaseCurrency) ||
			!isFinite(safeMarketCap)
		) {
			continue;
		}

		coinUpdates.push({
			id: holding.coinId!,
			newPrice,
			newPoolCoin,
			newPoolBaseCurrency,
			marketCap: safeMarketCap
		});
	}

	for (let i = 0; i < transactionRows.length; i += BATCH_CHUNK_SIZE) {
		await tx.insert(transaction).values(transactionRows.slice(i, i + BATCH_CHUNK_SIZE));
	}

	for (let i = 0; i < priceHistoryRows.length; i += BATCH_CHUNK_SIZE) {
		await tx.insert(priceHistory).values(priceHistoryRows.slice(i, i + BATCH_CHUNK_SIZE));
	}

	for (let i = 0; i < coinUpdates.length; i += BATCH_CHUNK_SIZE) {
		const chunk = coinUpdates.slice(i, i + BATCH_CHUNK_SIZE);

		const priceCases = sql.join(chunk.map(c => sql`WHEN ${c.id} THEN ${c.newPrice.toString()}::numeric`), sql` `);
		const marketCapCases = sql.join(chunk.map(c => sql`WHEN ${c.id} THEN ${c.marketCap.toString()}::numeric`), sql` `);
		const poolCoinCases = sql.join(chunk.map(c => sql`WHEN ${c.id} THEN ${c.newPoolCoin.toString()}::numeric`), sql` `);
		const poolBaseCases = sql.join(chunk.map(c => sql`WHEN ${c.id} THEN ${c.newPoolBaseCurrency.toString()}::numeric`), sql` `);
		const idList = sql.join(chunk.map(c => sql`${c.id}`), sql`, `);

		await tx.execute(sql`
			UPDATE coin SET
				current_price = CASE id ${priceCases} END,
				market_cap = CASE id ${marketCapCases} END,
				pool_coin_amount = CASE id ${poolCoinCases} END,
				pool_base_currency_amount = CASE id ${poolBaseCases} END,
				updated_at = NOW()
			WHERE id IN (${idList})
		`);
	}

	await tx.delete(userPortfolio).where(eq(userPortfolio.userId, userId));

	return { totalSaleValue, coinsSold: holdings.length };
}
